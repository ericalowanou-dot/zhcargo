import { SignJWT, jwtVerify } from "jose";

export function getSecretKey() {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) {
    throw new Error("NEXTAUTH_SECRET est requis");
  }
  return new TextEncoder().encode(s);
}

export async function createHandoffToken(clientId: string, phone: string) {
  return new SignJWT({ clientId, phone })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("3m")
    .sign(getSecretKey());
}

export async function verifyHandoffToken(token: string) {
  const { payload } = await jwtVerify(token, getSecretKey());
  const clientId = payload.clientId as string | undefined;
  const phone = payload.phone as string | undefined;
  if (!clientId || !phone) {
    throw new Error("Jeton invalide");
  }
  return { clientId, phone };
}
