import { SignJWT, jwtVerify } from "jose";
import { getSecretKey } from "./handoff-jwt";

export async function createAdminHandoffToken(admin: {
  id: string;
  email: string;
  name: string;
}) {
  return new SignJWT({
    adminId: admin.id,
    email: admin.email,
    name: admin.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(getSecretKey());
}

export async function verifyAdminHandoffToken(token: string) {
  const { payload } = await jwtVerify(token, getSecretKey());
  const adminId = payload.adminId as string | undefined;
  const email = payload.email as string | undefined;
  const name = (payload.name as string | undefined) || "";
  if (!adminId || !email) {
    throw new Error("Jeton invalide");
  }
  return { adminId, email, name };
}
