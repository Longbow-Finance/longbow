"use client";

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { LITEPAPER_META, SECTIONS, parseRuns, type Block } from "@/content/litepaper";

Font.register({
  family: "Grotesk",
  fonts: [
    { src: "/fonts/SpaceGrotesk-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/SpaceGrotesk-Medium.ttf", fontWeight: 500 },
    { src: "/fonts/SpaceGrotesk-Bold.ttf", fontWeight: 700 },
  ],
});
Font.register({
  family: "Mono",
  fonts: [
    { src: "/fonts/JetBrainsMono-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/JetBrainsMono-Bold.ttf", fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const C = {
  bg: "#08090a",
  panel: "#0d0f10",
  bgInset: "#111517",
  border: "#232b2f",
  long: "#c6f24e",
  fg: "#e9efe6",
  muted: "#9aa39c",
};

const s = StyleSheet.create({
  page: {
    backgroundColor: C.bg,
    color: C.fg,
    fontFamily: "Grotesk",
    fontSize: 9.5,
    paddingTop: 46,
    paddingBottom: 54,
    paddingHorizontal: 46,
    lineHeight: 1.5,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18 },
  brandMark: {
    width: 16,
    height: 16,
    backgroundColor: C.long,
  },
  brandName: { fontFamily: "Mono", fontSize: 9, letterSpacing: 2, color: C.fg },
  eyebrow: { fontFamily: "Mono", fontSize: 8, letterSpacing: 2, color: C.long, marginBottom: 8 },
  title: { fontFamily: "Grotesk", fontWeight: 700, fontSize: 30, letterSpacing: -0.5, lineHeight: 1.05 },
  titleAccent: { color: C.long },
  intro: { color: C.muted, fontSize: 10, marginTop: 12, maxWidth: 420 },
  metaRow: { flexDirection: "row", gap: 18, marginTop: 16 },
  meta: { fontFamily: "Mono", fontSize: 7.5, letterSpacing: 1.5, color: C.muted },
  rule: { borderBottomWidth: 1, borderBottomColor: C.border, marginTop: 22, marginBottom: 4 },

  section: { marginTop: 22 },
  secHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 9 },
  secNum: { fontFamily: "Mono", fontSize: 10, color: C.long },
  secTitle: { fontFamily: "Grotesk", fontWeight: 700, fontSize: 15, color: C.fg },

  p: { color: C.muted, marginBottom: 8 },
  code: { fontFamily: "Mono", fontSize: 8.5, color: C.long },

  listRow: { flexDirection: "row", gap: 8, marginBottom: 5 },
  listNum: { fontFamily: "Mono", fontSize: 8, color: C.long, marginTop: 1 },
  listText: { color: C.muted, flex: 1 },

  formula: {
    fontFamily: "Mono",
    fontSize: 9.5,
    color: C.long,
    backgroundColor: C.bgInset,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 4,
  },

  callout: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgInset,
    marginVertical: 4,
  },
  calloutTitle: {
    fontFamily: "Mono",
    fontSize: 7.5,
    letterSpacing: 1.5,
    color: C.long,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  calloutLine: { fontFamily: "Mono", fontSize: 8, color: C.fg, lineHeight: 1.6 },
  calloutBody: { paddingVertical: 8, paddingHorizontal: 12 },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 46,
    right: 46,
    flexDirection: "row",
    justifyContent: "space-between",
    fontFamily: "Mono",
    fontSize: 7,
    letterSpacing: 1,
    color: C.muted,
  },
});

function Inline({ text }: { text: string }) {
  return (
    <>
      {parseRuns(text).map((r, i) =>
        r.code ? (
          <Text key={i} style={s.code}>
            {r.text}
          </Text>
        ) : (
          r.text
        ),
      )}
    </>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "p":
      return (
        <Text style={s.p}>
          <Inline text={block.text} />
        </Text>
      );
    case "list":
      return (
        <View>
          {block.items.map((it, i) => (
            <View key={i} style={s.listRow}>
              <Text style={s.listNum}>{String(i + 1).padStart(2, "0")}</Text>
              <Text style={s.listText}>
                <Inline text={it} />
              </Text>
            </View>
          ))}
        </View>
      );
    case "formula":
      return <Text style={s.formula}>{block.text}</Text>;
    case "callout":
      return (
        <View style={s.callout} wrap={false}>
          {block.title && <Text style={s.calloutTitle}>{block.title}</Text>}
          <View style={s.calloutBody}>
            {block.lines.map((ln, i) => (
              <Text key={i} style={s.calloutLine}>
                {ln}
              </Text>
            ))}
          </View>
        </View>
      );
  }
}

export function LitepaperDocument() {
  return (
    <Document title={LITEPAPER_META.title} author="Longbow Protocol">
      <Page size="A4" style={s.page}>
        <View style={s.brandRow} fixed={false}>
          <View style={s.brandMark} />
          <Text style={s.brandName}>LONGBOW / PROTOCOL</Text>
        </View>

        <Text style={s.eyebrow}>[ LITEPAPER ]</Text>
        <Text style={s.title}>
          THE LONGBOW <Text style={s.titleAccent}>LITEPAPER</Text>
        </Text>
        <Text style={s.intro}>{LITEPAPER_META.intro}</Text>
        <View style={s.metaRow}>
          <Text style={s.meta}>{LITEPAPER_META.version}</Text>
          <Text style={s.meta}>{LITEPAPER_META.chain}</Text>
          <Text style={s.meta}>{LITEPAPER_META.status}</Text>
        </View>
        <View style={s.rule} />

        {SECTIONS.map((sec) => (
          <View key={sec.id} style={s.section} wrap={false}>
            <View style={s.secHead}>
              <Text style={s.secNum}>{sec.n}</Text>
              <Text style={s.secTitle}>{sec.title}</Text>
            </View>
            {sec.blocks.map((b, j) => (
              <BlockView key={j} block={b} />
            ))}
          </View>
        ))}

        <View style={s.footer} fixed>
          <Text>LONGBOW PROTOCOL · LITEPAPER</Text>
          <Text
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
