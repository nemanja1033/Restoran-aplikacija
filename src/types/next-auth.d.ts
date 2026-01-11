import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      username: string;
      accountId: number;
      role: "admin" | "staff";
    };
  }

  interface User {
    username: string;
    accountId: number;
    role: "admin" | "staff";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username: string;
    accountId: number;
    role: "admin" | "staff";
  }
}
