import "server-only";
import { prisma } from "@/lib/db";

type CanViewResult =
  | { allowed: true; document: { id: string; title: string; userId: string } }
  | { allowed: false; reason: string };

export async function canViewDocument(session: any, documentId: string): Promise<CanViewResult> {
  const userId = session?.user?.id as string | undefined;
  const email = (session?.user?.email as string | undefined)?.toLowerCase();

  if (!userId) return { allowed: false, reason: "Unauthorized" };

  // 1) Load document (SELECT ONLY — no include here)
  const doc = await prisma.document.findFirst({
    where: { id: documentId },
    select: {
      id: true,
      title: true,
      userId: true,
    },
  });

  if (!doc) return { allowed: false, reason: "Document not found" };

  // 2) Owner can view
  if (doc.userId === userId) return { allowed: true, document: doc };

  // 3) Admin can view (optional, if you use role/userRole)
  const role = (session?.user as any)?.role;
  const userRole = (session?.user as any)?.userRole;
  if (role === "ADMIN" || userRole === "ADMIN") {
    return { allowed: true, document: doc };
  }

  // 4) MyJstudyroom entitlement: user bought/added a BookShopItem whose documentId = this doc
  const ownedInMyJstudyroom = await prisma.myJstudyroomItem.findFirst({
    where: {
      userId,
      bookShopItem: {
        documentId: documentId,
      },
    },
    select: { id: true },
  });

  if (ownedInMyJstudyroom) return { allowed: true, document: doc };

  // 5) Email share entitlement (optional, if you use DocumentShare)
  const share = await prisma.documentShare.findFirst({
    where: {
      documentId,
      OR: [
        { sharedWithUserId: userId },
        ...(email ? [{ sharedWithEmail: email }] : []),
      ],
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  });

  if (share) return { allowed: true, document: doc };

  return { allowed: false, reason: "Access denied" };
}
