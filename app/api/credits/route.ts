import { NextResponse } from "next/server";
import { getBalance, getTransactionHistory } from "@/lib/wallet/credits";
import { getSessionUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Auth required" }, { status: 401 });
    }

    const [balance, transactions] = await Promise.all([
      getBalance(user.id),
      getTransactionHistory(user.id, 20),
    ]);

    return NextResponse.json({ balance, transactions });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
