import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  createCustodialWallet,
  connectExternalWallet,
  getUserWallet,
} from "@/lib/wallet/polygon";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Auth required" }, { status: 401 });
    }

    const wallet = await getUserWallet(user.id);

    // Auto-create custodial wallet if not exists
    if (!wallet.custodial) {
      const { address } = await createCustodialWallet(user.id);
      wallet.custodial = { address, type: "custodial", chain: "polygon" };
    }

    return NextResponse.json(wallet);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Auth required" }, { status: 401 });
    }

    const { action, address } = await req.json();

    if (action === "connect_external") {
      await connectExternalWallet(user.id, address);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}
