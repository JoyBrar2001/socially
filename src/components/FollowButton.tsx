"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Loader2Icon } from "lucide-react";
import toast from "react-hot-toast";
import { toggleFollow } from "@/actions/user.action";

export default function FollowButton({ userId }: { userId: string }) {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleFollow = async () => {
    setIsLoading(true);

    try {
      const result = await toggleFollow(userId);

      if (result.success) {
        toast.success("User followed successfully");
      }
    } catch (error) {
      toast.error("Error following user");

      console.error("Error following user : ", error)
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      size={"sm"}
      variant={"secondary"}
      onClick={handleFollow}
      disabled={isLoading}
      className="w-20"
    >
      {isLoading ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        "Follow"
      )}
    </Button>
  );
}