import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      clientId?: string;
      phone?: string;
      country?: string;
      isAdmin?: boolean;
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    clientId?: string;
    phone?: string;
    country?: string;
    isAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    clientId?: string;
    phone?: string;
    country?: string;
    isAdmin?: boolean;
    adminId?: string;
    email?: string;
  }
}
