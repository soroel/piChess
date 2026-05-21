"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePurchase, useUserState } from "@/lib/pi-payment";
import { usePiAuth }   from "@/contexts/pi-auth-context";
import { PRODUCT_CONFIG } from "@/lib/product-config";

/* ─── Tip amounts ─────────────────────────────────────── */
const PRESETS = [
  { label: "0.1 π",  value: "tip_0_1"  },
  { label: "0.5 π",  value: "tip_0_5"  },
  { label: "1 π",    value: "tip_1"    },
  { label: "3 π",    value: "tip_3"    },
  { label: "5 π",    value: "tip_5"    },
];

type TipState = "idle" | "pending" | "success" | "error";

interface TipModalProps {
  onClose: () => void;
}

const CHESS_COURSES_PRODUCT_ID = PRODUCT_CONFIG.PRODUCT_69bc284d03ac4bc03ee7e245;

export function TipModal({ onClose }: TipModalProps) {
  const { isAuthenticated, products, restoredPurchases } = usePiAuth();
  const { makePurchase } = usePurchase();
  const { consume }      = useUserState();

  const chessCoursesProduct = products?.find(
    (p) => p.id === PRODUCT_CONFIG.PRODUCT_69bc284d03ac4bc03ee7e245
  ) ?? null;
  const chessCoursesAmount = chessCoursesProduct?.price_in_pi ?? 0.5;

  const restoredCourses = restoredPurchases?.find(
    (r) => r.productId === CHESS_COURSES_PRODUCT_ID
  );
  const [coursesCount, setCoursesCount] = useState<number>(
    restoredCourses?.quantity ?? 0
  );

  const [selected,        setSelected]        = useState<string>(PRESETS[1].value);
  const [tipState,        setTipState]        = useState<TipState>("idle");
  const [errorMsg,        setErrorMsg]        = useState("");
  const [txid,            setTxid]            = useState("");
  const [courseState,     setCourseState]     = useState<TipState>("idle");
  const [courseError,     setCourseError]     = useState("");
  const [courseTxid,      setCourseTxid]      = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  /* Close on outside tap */
  useEffect(() => {
    if (tipState === "pending") return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown",  handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown",  handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [onClose, tipState]);

  /* Close on Escape */
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && tipState !== "pending") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, tipState]);

  async function handleTip() {
    if (!isAuthenticated || !sdk) {
      setErrorMsg("Pi Network not connected. Please restart the app.");
      setTipState("error");
      return;
    }
    setTipState("pending");
    setErrorMsg("");
    try {
      const result = await makePurchase(selected);
      setTxid(result.txid);
      setTipState("success");
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e?.code === "purchase_cancelled") {
        setTipState("idle");
      } else {
        setErrorMsg(e?.message ?? "Something went wrong. Please try again.");
        setTipState("error");
      }
    }
  }

  async function handleCoursesPurchase() {
    if (!isAuthenticated || !sdk) {
      setCourseError("Pi Network not connected. Please restart the app.");
      setCourseState("error");
      return;
    }
    if (!chessCoursesProduct) {
      setCourseError("Product not available. Please try again later.");
      setCourseState("error");
      return;
    }
    setCourseState("pending");
    setCourseError("");
    try {
      const result = await makePurchase(CHESS_COURSES_PRODUCT_ID);
      setCourseTxid((result as any)?.txid ?? "");
      setCoursesCount((c) => c + 1);
      setCourseState("success");
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e?.code === "purchase_cancelled") {
        setCourseState("idle");
      } else if (e?.code === "product_not_found") {
        setCourseError("Course product not found. Please contact support.");
        setCourseState("error");
      } else {
        setCourseError(e?.message ?? "Something went wrong. Please try again.");
        setCourseState("error");
      }
    }
  }

  async function handleConsumeOne() {
    if (coursesCount <= 0) return;
    try {
      await consume(CHESS_COURSES_PRODUCT_ID, 1);
      setCoursesCount((c) => Math.max(0, c - 1));
    } catch {
      /* silently ignore consume errors */
    }
  }

  const selectedLabel = PRESETS.find(p => p.value === selected)?.label ?? "";
  const isPending     = tipState === "pending";
  const isCoursePending = courseState === "pending";

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center"
      style={{ zIndex: 70, backgroundColor: "rgba(0,0,0,0.82)", backdropFilter: "blur(10px)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Send a tip"
    >
      <div
        ref={cardRef}
        className="animate-modal-in w-full flex flex-col gap-5 rounded-t-3xl sm:rounded-3xl p-6"
        style={{
          maxWidth:   400,
          background: "linear-gradient(160deg, #0d1220 0%, #111a0c 60%, #0a1008 100%)",
          border:     "1.5px solid rgba(212,175,55,0.35)",
          boxShadow:  "0 0 80px rgba(212,175,55,0.15), 0 32px 96px rgba(0,0,0,0.95)",
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h2
              className="font-bold text-balance"
              style={{ fontSize: 22, color: "#e8dfc0", letterSpacing: "-0.02em" }}
            >
              Support the Developer
            </h2>
            <p style={{ color: "#5a7888", fontSize: 12.5, marginTop: 3 }}>
              Enjoying Chess? Send a Pi tip!
            </p>
          </div>
          {tipState !== "pending" && (
            <button
              onClick={onClose}
              aria-label="Close tip dialog"
              style={{
                width:       32,
                height:      32,
                borderRadius: 10,
                display:      "flex",
                alignItems:   "center",
                justifyContent: "center",
                background:   "rgba(255,255,255,0.06)",
                border:       "1px solid rgba(255,255,255,0.10)",
                color:        "#5a7888",
                fontSize:     18,
                cursor:       "pointer",
                flexShrink:   0,
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* ── Chess Courses Payment Section ── */}
        <div
          className="rounded-2xl p-4 flex flex-col gap-3"
          style={{
            background: "rgba(212,175,55,0.06)",
            border:     "1.5px solid rgba(212,175,55,0.22)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              style={{
                width:          40,
                height:         40,
                borderRadius:   12,
                background:     "rgba(212,175,55,0.15)",
                border:         "1.5px solid rgba(212,175,55,0.35)",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                fontSize:       22,
                flexShrink:     0,
              }}
            >
              ♟
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ color: "#e8dfc0", fontSize: 13.5, fontWeight: 800 }}>
                Chess Courses
              </p>
              <p style={{ color: "#5a7888", fontSize: 11, marginTop: 1 }}>
                Tips &mdash; unlock premium chess lessons
              </p>
            </div>
            <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
              <span style={{ color: "#d4af37", fontSize: 14, fontWeight: 800 }}>
                π {chessCoursesAmount}
              </span>
              {coursesCount > 0 && (
                <span
                  style={{
                    color:        "#3a8060",
                    fontSize:     10,
                    background:   "rgba(58,128,96,0.15)",
                    border:       "1px solid rgba(58,128,96,0.35)",
                    borderRadius: 6,
                    padding:      "1px 6px",
                    fontWeight:   700,
                  }}
                >
                  Owned: {coursesCount}
                </span>
              )}
            </div>
          </div>

          {courseState === "success" ? (
            <div className="flex flex-col items-center gap-2 py-1">
              <p style={{ color: "#d4af37", fontSize: 13, fontWeight: 800, textAlign: "center" }}>
                Purchase successful!
              </p>
              {courseTxid && (
                <p
                  style={{
                    color:      "#3a6070",
                    fontSize:   10,
                    wordBreak:  "break-all",
                    fontFamily: "monospace",
                    textAlign:  "center",
                  }}
                >
                  TX: {courseTxid}
                </p>
              )}
              {coursesCount > 0 && (
                <button
                  onClick={handleConsumeOne}
                  className="rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-95"
                  style={{
                    background: "rgba(58,128,96,0.18)",
                    border:     "1.5px solid rgba(58,128,96,0.40)",
                    color:      "#5fc090",
                    cursor:     "pointer",
                  }}
                >
                  Use 1 Course
                </button>
              )}
            </div>
          ) : (
            <>
              {courseState === "error" && (
                <div
                  className="rounded-xl px-3 py-2"
                  style={{
                    background: "rgba(200,60,60,0.10)",
                    border:     "1px solid rgba(200,60,60,0.30)",
                    color:      "#f08080",
                    fontSize:   11.5,
                  }}
                  role="alert"
                >
                  {courseError}
                </div>
              )}
              <button
                onClick={handleCoursesPurchase}
                disabled={isCoursePending || !chessCoursesProduct}
                className="w-full rounded-xl py-3 text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
                style={{
                  background:    isCoursePending || !chessCoursesProduct
                    ? "rgba(212,175,55,0.20)"
                    : "rgba(212,175,55,0.88)",
                  color:         isCoursePending || !chessCoursesProduct ? "#7a6820" : "#07091a",
                  border:        "none",
                  letterSpacing: "0.02em",
                  cursor:        isCoursePending || !chessCoursesProduct ? "not-allowed" : "pointer",
                }}
                aria-busy={isCoursePending}
                title={!chessCoursesProduct ? "Product unavailable" : undefined}
              >
                {isCoursePending ? (
                  <>
                    <span
                      className="inline-block"
                      style={{
                        width:          14,
                        height:         14,
                        borderRadius:   "50%",
                        border:         "2.5px solid rgba(7,9,26,0.3)",
                        borderTopColor: "#07091a",
                        animation:      "spin 0.7s linear infinite",
                      }}
                    />
                    Processing…
                  </>
                ) : !chessCoursesProduct ? (
                  "Unavailable"
                ) : (
                  <>
                    <span style={{ fontSize: 15 }}>π</span>
                    {chessCoursesAmount} — Get Chess Courses
                  </>
                )}
              </button>
            </>
          )}
        </div>

        <div
          style={{
            height:     1,
            background: "rgba(255,255,255,0.06)",
            margin:     "0 -4px",
          }}
        />

        {tipState === "success" ? (
          /* ── Success state ── */
          <div className="flex flex-col items-center gap-4 py-4">
            <div
              style={{
                fontSize:   64,
                lineHeight: 1,
                filter:     "drop-shadow(0 0 32px rgba(212,175,55,0.8))",
              }}
            >
              ♔
            </div>
            <div className="text-center">
              <p style={{ color: "#d4af37", fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
                Thank you!
              </p>
              <p style={{ color: "#e8dfc0", fontSize: 13 }}>
                Your {selectedLabel} tip was received.
              </p>
              {txid && (
                <p
                  style={{
                    color:        "#3a6070",
                    fontSize:     10.5,
                    marginTop:    8,
                    wordBreak:    "break-all",
                    fontFamily:   "monospace",
                  }}
                >
                  TX: {txid}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-full rounded-2xl py-3 text-sm font-bold transition-all active:scale-95"
              style={{
                background:    "#d4af37",
                color:         "#07091a",
                border:        "none",
                letterSpacing: "0.03em",
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* ── Tip amount grid ── */}
            <div>
              <p style={{ color: "#5a7888", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Choose amount
              </p>
              <div className="grid grid-cols-5 gap-2">
                {PRESETS.map(p => {
                  const isActive = p.value === selected;
                  return (
                    <button
                      key={p.value}
                      onClick={() => !isPending && setSelected(p.value)}
                      className="flex flex-col items-center justify-center rounded-2xl transition-all active:scale-95"
                      style={{
                        padding:    "10px 4px",
                        background: isActive ? "rgba(212,175,55,0.18)" : "rgba(255,255,255,0.04)",
                        border:     isActive ? "1.5px solid rgba(212,175,55,0.75)" : "1.5px solid rgba(255,255,255,0.08)",
                        color:      isActive ? "#d4af37" : "#5a7888",
                        fontSize:   11,
                        fontWeight: 700,
                        cursor:     isPending ? "not-allowed" : "pointer",
                        opacity:    isPending ? 0.5 : 1,
                      }}
                      disabled={isPending}
                      aria-pressed={isActive}
                    >
                      {/* Pi symbol */}
                      <span style={{ fontSize: 16, lineHeight: 1.2, color: isActive ? "#d4af37" : "#3a5060" }}>π</span>
                      <span style={{ marginTop: 2 }}>{p.label.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Pi attribution ── */}
            <div
              className="flex items-center gap-3 rounded-2xl p-3"
              style={{
                background: "rgba(255,255,255,0.03)",
                border:     "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div
                style={{
                  width:         38,
                  height:        38,
                  borderRadius:  12,
                  background:    "rgba(212,175,55,0.12)",
                  border:        "1.5px solid rgba(212,175,55,0.30)",
                  display:       "flex",
                  alignItems:    "center",
                  justifyContent:"center",
                  fontSize:      22,
                  flexShrink:    0,
                }}
              >
                π
              </div>
              <div>
                <p style={{ color: "#e8dfc0", fontSize: 12.5, fontWeight: 700 }}>Pi Network Payment</p>
                <p style={{ color: "#3a5060", fontSize: 11, marginTop: 1 }}>
                  Secure · Decentralised · Instant
                </p>
              </div>
            </div>

            {/* ── Error message ── */}
            {tipState === "error" && (
              <div
                className="rounded-2xl px-4 py-3"
                style={{
                  background: "rgba(200,60,60,0.10)",
                  border:     "1px solid rgba(200,60,60,0.30)",
                  color:      "#f08080",
                  fontSize:   12.5,
                }}
                role="alert"
              >
                {errorMsg}
              </div>
            )}

            {/* ── Send button ── */}
            <button
              onClick={handleTip}
              disabled={isPending}
              className="w-full rounded-2xl py-3.5 text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{
                background:    isPending ? "rgba(212,175,55,0.35)" : "#d4af37",
                color:         "#07091a",
                border:        "none",
                letterSpacing: "0.03em",
                cursor:        isPending ? "not-allowed" : "pointer",
                opacity:       isPending ? 0.7 : 1,
              }}
              aria-busy={isPending}
            >
              {isPending ? (
                <>
                  <span
                    className="inline-block"
                    style={{
                      width:       16,
                      height:      16,
                      borderRadius:"50%",
                      border:      "2.5px solid rgba(7,9,26,0.4)",
                      borderTopColor: "#07091a",
                      animation:   "spin 0.7s linear infinite",
                    }}
                  />
                  Processing…
                </>
              ) : (
                <>
                  <span style={{ fontSize: 16 }}>π</span>
                  Send {selectedLabel} Tip
                </>
              )}
            </button>

            <p style={{ color: "#2a4050", fontSize: 10.5, textAlign: "center", marginTop: -8 }}>
              Tips are non-refundable and go directly to the developer.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
