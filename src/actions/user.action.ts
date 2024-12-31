"use server";

import prisma from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";

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
      throw new Error("Unauthorized");
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