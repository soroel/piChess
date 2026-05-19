"use client";

import React, { useState, useRef } from "react";
import { BOARD_THEMES, type BoardTheme } from "@/components/chess-board";
import type { BgTheme } from "@/components/chess-background";

export type AppTheme = "dark" | "light";

// ─── Background preset options ───────────────────────────────────────────────

const BG_OPTIONS: { id: BgTheme; label: string; dot: string }[] = [
  { id: "navy",     label: "Deep Navy",  dot: "#d4af37" },
  { id: "crimson",  label: "Crimson",    dot: "#e02040" },
  { id: "forest",   label: "Forest",     dot: "#30b060" },
  { id: "amethyst", label: "Amethyst",   dot: "#9040e0" },
];

// ─── Colour palette swatches ─────────────────────────────────────────────────

const COLOR_PALETTE: { hex: string; label: string }[] = [
  // Darks / neutrals
  { hex: "#060810", label: "Deep Navy"    },
  { hex: "#0d0608", label: "Deep Crimson" },
  { hex: "#060d08", label: "Deep Forest"  },
  { hex: "#0a0610", label: "Amethyst"     },
  { hex: "#080808", label: "Jet Black"    },
  { hex: "#101010", label: "Charcoal"     },
  // Mids
  { hex: "#1a2a3a", label: "Ocean"        },
  { hex: "#1a0a0a", label: "Burgundy"     },
  { hex: "#0a1a0a", label: "Evergreen"    },
  { hex: "#1a0a1a", label: "Plum"         },
  { hex: "#1a1a0a", label: "Olive"        },
  { hex: "#2a1a0a", label: "Mocha"        },
  // Light / bright
  { hex: "#c8b88a", label: "Parchment"    },
  { hex: "#e8e0d0", label: "Ivory"        },
  { hex: "#d0dce8", label: "Ice Blue"     },
  { hex: "#d8e8d0", label: "Mint"         },
  { hex: "#e8d0d8", label: "Rose"         },
  { hex: "#ede0c0", label: "Wheat"        },
  // Vivid accents
  { hex: "#203050", label: "Midnight"     },
  { hex: "#401020", label: "Garnet"       },
  { hex: "#102810", label: "Pine"         },
  { hex: "#200840", label: "Violet"       },
  { hex: "#402008", label: "Auburn"       },
  { hex: "#084040", label: "Teal"         },
];

// ─── Text colour palette ─────────────────────────────────────────────────────

const TEXT_PALETTE: { hex: string; label: string }[] = [
  { hex: "#e8dfc0", label: "Warm Ivory"   },
  { hex: "#ffffff", label: "White"        },
  { hex: "#d4af37", label: "Gold"         },
  { hex: "#a0c8e8", label: "Sky Blue"     },
  { hex: "#90e0a0", label: "Mint Green"   },
  { hex: "#f0a0b0", label: "Blush Pink"   },
  { hex: "#c8a0e8", label: "Lavender"     },
  { hex: "#f0c880", label: "Peach"        },
  { hex: "#0d1220", label: "Dark Slate"   },
  { hex: "#1a1a1a", label: "Near Black"   },
  { hex: "#2a3a4a", label: "Navy Text"    },
  { hex: "#3a2a0a", label: "Dark Brown"   },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      color: "#5a7888", fontSize: 9, fontWeight: 800,
      letterSpacing: "0.11em", textTransform: "uppercase", marginBottom: 9,
    }}>
      {children}
    </p>
  );
}

function PickerRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 6,
          background: value,
          border: "1.5px solid rgba(255,255,255,0.14)",
          boxShadow: `0 0 10px ${value}66`,
          transition: "box-shadow 0.2s ease",
        }} />
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            position: "absolute", inset: 0, opacity: 0,
            width: "100%", height: "100%", cursor: "pointer", border: "none",
          }}
          aria-label={label}
        />
      </div>
      <span style={{ color: "#7a9aaa", fontSize: 11, fontWeight: 600 }}>{label}</span>
    </label>
  );
}

function SwatchGrid({
  swatches,
  onSelect,
  activeHex,
}: {
  swatches: { hex: string; label: string }[];
  onSelect: (hex: string) => void;
  activeHex?: string;
}) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(8, 1fr)",
      gap: 5,
      marginBottom: 12,
    }}>
      {swatches.map(s => {
        const isActive = activeHex?.toLowerCase() === s.hex.toLowerCase();
        return (
          <button
            key={s.hex}
            title={s.label}
            aria-label={s.label}
            aria-pressed={isActive}
            onClick={() => onSelect(s.hex)}
            style={{
              width: "100%",
              aspectRatio: "1",
              borderRadius: 6,
              background: s.hex,
              border: isActive
                ? "2px solid rgba(212,175,55,0.9)"
                : "1.5px solid rgba(255,255,255,0.10)",
              boxShadow: isActive ? `0 0 8px ${s.hex}bb` : "none",
              cursor: "pointer",
              transition: "transform 0.12s ease, box-shadow 0.12s ease",
              transform: isActive ? "scale(1.15)" : "scale(1)",
              outline: "none",
              padding: 0,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface SettingsPanelProps {
  boardTheme:       BoardTheme;
  setBoardTheme:    (t: BoardTheme) => void;
  customBoard:      { light: string; dark: string } | null;
  setCustomBoard:   (c: { light: string; dark: string } | null) => void;
  bgTheme:          BgTheme;
  setBgTheme:       (t: BgTheme) => void;
  customBgColor:    string | null;
  setCustomBgColor: (c: string | null) => void;
  customBgImage:    string | null;
  setCustomBgImage: (img: string | null) => void;
  customTextColor:  string | null;
  setCustomTextColor: (c: string | null) => void;
  appTheme:         AppTheme;
  setAppTheme:      (t: AppTheme) => void;
  onSave?:          () => void;
}

export function SettingsPanel({
  boardTheme, setBoardTheme,
  customBoard, setCustomBoard,
  bgTheme, setBgTheme,
  customBgColor, setCustomBgColor,
  customBgImage, setCustomBgImage,
  customTextColor, setCustomTextColor,
  appTheme, setAppTheme,
  onSave,
}: SettingsPanelProps) {
  const [savedFlash, setSavedFlash] = useState(false);
  const [tab, setTab]               = useState<"board" | "background" | "text" | "theme">("board");
  const fileInputRef                = useRef<HTMLInputElement>(null);

  const [draftLight, setDraftLight] = useState(customBoard?.light ?? BOARD_THEMES[boardTheme].light);
  const [draftDark,  setDraftDark]  = useState(customBoard?.dark  ?? BOARD_THEMES[boardTheme].dark);
  const [draftBg,    setDraftBg]    = useState(customBgColor ?? "#060810");
  const [draftText,  setDraftText]  = useState(customTextColor ?? "#e8dfc0");

  const handleSave = () => {
    onSave?.();
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const applyCustomBoard = (light: string, dark: string) => {
    setDraftLight(light); setDraftDark(dark);
    setCustomBoard({ light, dark });
  };
  const resetCustomBoard = () => {
    setCustomBoard(null);
    setDraftLight(BOARD_THEMES[boardTheme].light);
    setDraftDark(BOARD_THEMES[boardTheme].dark);
  };

  const applyBgColor = (c: string) => {
    setDraftBg(c);
    setCustomBgColor(c);
    setCustomBgImage(null); // colour overrides image
  };
  const resetBg = () => {
    setCustomBgColor(null);
    setCustomBgImage(null);
    setDraftBg("#060810");
  };

  const applyTextColor = (c: string) => {
    setDraftText(c);
    setCustomTextColor(c);
  };
  const resetTextColor = () => {
    setCustomTextColor(null);
    setDraftText("#e8dfc0");
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      setCustomBgImage(dataUrl);
      setCustomBgColor(null); // image overrides colour
    };
    reader.readAsDataURL(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "5px 0",
    fontSize: 10,
    fontWeight: 700,
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    transition: "background 0.2s ease, color 0.2s ease",
    background: active ? "rgba(212,175,55,0.18)" : "transparent",
    color: active ? "#d4af37" : "#4a6272",
    letterSpacing: "0.03em",
  });

  return (
    <div
      className="animate-slide-up-fade"
      style={{
        background:     "rgba(8,12,20,0.96)",
        border:         "1px solid rgba(212,175,55,0.18)",
        backdropFilter: "blur(18px)",
        borderRadius:   18,
        overflow:       "hidden",
      }}
    >
      {/* Tab bar */}
      <div style={{
        display: "flex", gap: 4, padding: "8px 10px 4px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        {(["board", "background", "text", "theme"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>
            {t === "board" ? "Board" : t === "background" ? "BG" : t === "text" ? "Text" : "Theme"}
          </button>
        ))}
      </div>

      <div style={{ padding: "12px 14px 14px" }}>

        {/* ── Board tab ── */}
        {tab === "board" && (
          <>
            <SectionLabel>Board Preset</SectionLabel>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 16 }}>
              {(Object.entries(BOARD_THEMES) as [BoardTheme, { light: string; dark: string }][]).map(([name, c]) => {
                const isActive = boardTheme === name && !customBoard;
                return (
                  <button
                    key={name}
                    onClick={() => { setBoardTheme(name); resetCustomBoard(); setDraftLight(c.light); setDraftDark(c.dark); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "4px 9px", borderRadius: 10, cursor: "pointer",
                      border:      isActive ? "1.5px solid rgba(212,175,55,0.72)" : "1.5px solid rgba(255,255,255,0.08)",
                      background:  isActive ? "rgba(212,175,55,0.11)" : "rgba(255,255,255,0.03)",
                      transition:  "border 0.2s ease, background 0.2s ease",
                    }}
                    aria-pressed={isActive}
                    aria-label={`Board theme ${name}`}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,5px)", gap: 0, borderRadius: 2, overflow: "hidden", flexShrink: 0 }}>
                      {Array.from({ length: 16 }, (_, i) => (
                        <div key={i} style={{ width: 5, height: 5, background: (Math.floor(i / 4) + i) % 2 === 0 ? c.light : c.dark }} />
                      ))}
                    </div>
                    <span style={{ color: isActive ? "#d4af37" : "#4a6272", fontSize: 10, fontWeight: 700, textTransform: "capitalize" }}>
                      {name}
                    </span>
                  </button>
                );
              })}
            </div>

            <SectionLabel>Custom Square Colors</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <PickerRow label="Light squares" value={draftLight} onChange={v => applyCustomBoard(v, draftDark)} />
              <PickerRow label="Dark squares"  value={draftDark}  onChange={v => applyCustomBoard(draftLight, v)} />
              {customBoard && (
                <button
                  onClick={resetCustomBoard}
                  style={{
                    alignSelf: "flex-start", padding: "3px 10px", borderRadius: 8, fontSize: 10,
                    fontWeight: 700, cursor: "pointer",
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.26)", color: "#f87171",
                  }}
                >
                  Reset to preset
                </button>
              )}
            </div>
          </>
        )}

        {/* ── Background tab ── */}
        {tab === "background" && (
          <>
            <SectionLabel>Preset Theme</SectionLabel>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
              {BG_OPTIONS.map(opt => {
                const isActive = bgTheme === opt.id && !customBgColor && !customBgImage;
                return (
                  <button
                    key={opt.id}
                    onClick={() => { setBgTheme(opt.id); resetBg(); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "4px 9px", borderRadius: 10, cursor: "pointer",
                      border:     isActive ? "1.5px solid rgba(212,175,55,0.72)" : "1.5px solid rgba(255,255,255,0.08)",
                      background: isActive ? "rgba(212,175,55,0.11)" : "rgba(255,255,255,0.03)",
                      transition: "border 0.2s ease, background 0.2s ease",
                    }}
                    aria-pressed={isActive}
                    aria-label={`Background ${opt.label}`}
                  >
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: opt.dot, boxShadow: `0 0 7px ${opt.dot}aa`, flexShrink: 0 }} />
                    <span style={{ color: isActive ? "#d4af37" : "#4a6272", fontSize: 10, fontWeight: 700 }}>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            <SectionLabel>Color Palette</SectionLabel>
            <SwatchGrid
              swatches={COLOR_PALETTE}
              activeHex={customBgColor ?? ""}
              onSelect={applyBgColor}
            />

            <SectionLabel>Custom Color</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 14 }}>
              <PickerRow label="Pick any color" value={draftBg} onChange={applyBgColor} />
              {(customBgColor || customBgImage) && (
                <button
                  onClick={resetBg}
                  style={{
                    alignSelf: "flex-start", padding: "3px 10px", borderRadius: 8, fontSize: 10,
                    fontWeight: 700, cursor: "pointer",
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.26)", color: "#f87171",
                  }}
                >
                  Reset to theme
                </button>
              )}
            </div>

            <SectionLabel>Background Image</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Preview thumbnail if image is set */}
              {customBgImage && (
                <div style={{
                  width: "100%", height: 80, borderRadius: 10, overflow: "hidden",
                  border: "1.5px solid rgba(212,175,55,0.40)",
                  position: "relative",
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={customBgImage}
                    alt="Background preview"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "rgba(0,0,0,0.38)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ color: "#d4af37", fontSize: 10, fontWeight: 700 }}>Active</span>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: "none" }}
                aria-label="Upload background image"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: "7px 14px", borderRadius: 10, fontSize: 11,
                  fontWeight: 700, cursor: "pointer",
                  background: "rgba(212,175,55,0.08)",
                  border: "1.5px solid rgba(212,175,55,0.28)",
                  color: "#d4af37",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                {customBgImage ? "Change image" : "Upload image"}
              </button>

              {customBgImage && (
                <button
                  onClick={() => { setCustomBgImage(null); }}
                  style={{
                    alignSelf: "flex-start", padding: "3px 10px", borderRadius: 8, fontSize: 10,
                    fontWeight: 700, cursor: "pointer",
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.26)", color: "#f87171",
                  }}
                >
                  Remove image
                </button>
              )}
            </div>
          </>
        )}

        {/* ── Text tab ── */}
        {tab === "text" && (
          <>
            <SectionLabel>Text Color Palette</SectionLabel>
            <SwatchGrid
              swatches={TEXT_PALETTE}
              activeHex={customTextColor ?? ""}
              onSelect={applyTextColor}
            />

            <SectionLabel>Custom Text Color</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 16 }}>
              <PickerRow label="Pick any color" value={draftText} onChange={applyTextColor} />
              {customTextColor && (
                <button
                  onClick={resetTextColor}
                  style={{
                    alignSelf: "flex-start", padding: "3px 10px", borderRadius: 8, fontSize: 10,
                    fontWeight: 700, cursor: "pointer",
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.26)", color: "#f87171",
                  }}
                >
                  Reset to auto
                </button>
              )}
            </div>

            {/* Live preview */}
            <SectionLabel>Preview</SectionLabel>
            <div style={{
              padding: "10px 14px", borderRadius: 12,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}>
              <p style={{ color: draftText, fontSize: 15, fontWeight: 800, marginBottom: 3, textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>Chess</p>
              <p style={{ color: draftText + "bb", fontSize: 11, fontWeight: 600 }}>
                Playing as <span style={{ color: "#d4af37" }}>Player</span>
              </p>
            </div>

            <p style={{ color: "#3a5260", fontSize: 10, marginTop: 10, lineHeight: 1.55 }}>
              Auto mode adapts text based on background brightness. Override it here for manual control.
            </p>
          </>
        )}

        {/* ── Theme tab ── */}
        {tab === "theme" && (
          <>
            <SectionLabel>App Theme</SectionLabel>
            <div style={{ display: "flex", gap: 8 }}>
              {(["dark", "light"] as AppTheme[]).map(t => {
                const isActive = appTheme === t;
                return (
                  <button
                    key={t}
                    onClick={() => setAppTheme(t)}
                    style={{
                      flex: 1,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                      padding: "10px 0", borderRadius: 12, cursor: "pointer",
                      border:     isActive ? "1.5px solid rgba(212,175,55,0.72)" : "1.5px solid rgba(255,255,255,0.08)",
                      background: isActive ? "rgba(212,175,55,0.11)" : "rgba(255,255,255,0.03)",
                      transition: "border 0.2s ease, background 0.2s ease",
                    }}
                    aria-pressed={isActive}
                    aria-label={`${t} theme`}
                  >
                    <span style={{ fontSize: 18, lineHeight: 1 }}>
                      {t === "dark" ? "●" : "○"}
                    </span>
                    <span style={{ color: isActive ? "#d4af37" : "#4a6272", fontSize: 12, fontWeight: 700, textTransform: "capitalize" }}>
                      {t}
                    </span>
                  </button>
                );
              })}
            </div>
            <p style={{ color: "#3a5260", fontSize: 10, marginTop: 10, lineHeight: 1.55 }}>
              Light theme brightens panels for daytime play. The animated background runs in both modes.
            </p>
          </>
        )}

      </div>

      {/* Save button */}
      <div style={{ padding: "0 14px 14px" }}>
        <button
          onClick={handleSave}
          className="w-full rounded-xl py-2.5 font-bold transition-all active:scale-95"
          style={{
            background:    savedFlash ? "rgba(74,222,128,0.14)" : "rgba(212,175,55,0.10)",
            border:        savedFlash ? "1.5px solid rgba(74,222,128,0.48)" : "1.5px solid rgba(212,175,55,0.32)",
            color:         savedFlash ? "#4ade80" : "#d4af37",
            fontSize:      12,
            fontWeight:    800,
            letterSpacing: "0.04em",
            transition:    "all 0.25s ease",
          }}
          aria-label="Save preferences"
        >
          {savedFlash ? "Saved!" : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}
