"use server";

import prisma from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function syncUser() {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!user || !userId) {
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        clerkId: userId,
      },
    });

    if (existingUser) {
      return existingUser;
    }

    const dbUser = await prisma.user.create({
      data: {
        clerkId: userId,
        name: `${user.firstName || ""} ${user.lastName || ""}`,
        username: user.username ?? user.emailAddresses[0].emailAddress.split("@")[0],
        email: user.emailAddresses[0].emailAddress,
        image: user.imageUrl,
      }
    });

    return dbUser;
  } catch (error) {
    console.log("Error in syncUser : ", error);
  }
}

export async function getUserByClerkId(clerkId: string) {
  try {
    const user = prisma
      .user
      .findUnique({
        where: {
          clerkId,
        },
        include: {
          _count: {
            select: {
              followers: true,
              following: true,
              posts: true,
            },
          },
        },
      });

    return user;
  } catch (error) {
    console.log("Error in getting user by Id : ", error);
  }
}

export async function getDbUserId() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return null;
    }

    const user = await prisma
      .user
      .findUnique({
        where: {
          clerkId,
        },
      });

    if (!user) {
      throw new Error("User not found");
    }

    return user.id;
  } catch (error) {
    console.log("Error in db user Id : ", error);
  }
}

export async function getRandomUsers() {
  try {
    const userId = await getDbUserId();

    if (!userId) {
      return [];
    }

    const randomUsers = await prisma
      .user
      .findMany({
        where: {
          AND: [
            {
              NOT: {
                id: userId
              }
            },
            {
              NOT: {
                followers: {
                  some: {
                    followerId: userId
                  },
                },
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          _count: {
            select: {
              followers: true,
            },
          },
        },
        take: 3,
      });

    return randomUsers;
  } catch (error) {
    console.log("Error in fetching users : ", error);
    return [];
  }
}

export async function toggleFollow(targetUserId: string) {
  try {
    const userId = await getDbUserId();

    if (!userId) {
      throw new Error("Unauthorized");
    }

    if (userId === targetUserId) {
      throw new Error("You cannot follow yourself");
    }

    const existingFollow = await prisma
      .follows
      .findUnique({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: targetUserId,
          },
        },
      });

    if (existingFollow) {
      await prisma
        .follows
        .delete({
          where: {
            followerId_followingId: {
              followerId: userId,
              followingId: targetUserId,
            },
          },
        });
    } else {
      await prisma.$transaction([
        prisma
          .follows
          .create({
            data: {
              followerId: userId,
              followingId: targetUserId,
            },
          }),

        prisma
          .notification
          .create({
            data: {
              type: "FOLLOW",
              userId: targetUserId,
              creatorId: userId,
            },
          }),
      ]);
    }

    revalidatePath("/");
    revalidatePath("/profile/[username]");

    return { success: true };
  } catch (error) {
    console.error("Error in following user : ", error);

    return { success: false, error: `Error in following user : ${error}` };
  }
}