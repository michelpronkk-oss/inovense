import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export type InsightsKPI = { label: string; value: string; delta: string };
export type InsightsSeries = { label: string; val: number };
export type InsightsAgent = { name: string; actions: number; outputs: number; success: number };

export type InsightsReportData = {
  workspace: string;
  periodLabel: string;
  generatedAt: string;
  kpis: InsightsKPI[];
  weeklyActions: InsightsSeries[];
  weeklyHoursSaved: InsightsSeries[];
  operators: InsightsAgent[];
};

const c = {
  bg: "#06070A",
  panel: "#0D1118",
  line: "#1B2430",
  text: "#ECEFF3",
  dim: "#A4ABB4",
  mute: "#6B7178",
  cyan: "#4DE8E1",
  green: "#51D88A",
};

const s = StyleSheet.create({
  page: {
    backgroundColor: c.bg,
    color: c.text,
    paddingTop: 26,
    paddingHorizontal: 28,
    paddingBottom: 28,
    fontSize: 10.5,
    fontFamily: "Helvetica",
  },
  eyebrow: {
    color: c.cyan,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  h1: { fontSize: 24, fontWeight: 700, marginBottom: 6 },
  sub: { fontSize: 10, color: c.dim, marginBottom: 14 },
  row: { flexDirection: "row", gap: 10, marginBottom: 10 },
  card: {
    flexGrow: 1,
    backgroundColor: c.panel,
    borderColor: c.line,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  cardLabel: { fontSize: 8.6, textTransform: "uppercase", color: c.mute, marginBottom: 8, letterSpacing: 0.8 },
  cardValue: { fontSize: 20, fontWeight: 700, marginBottom: 5 },
  cardDelta: { fontSize: 9, color: c.green },
  section: { marginTop: 12, marginBottom: 8, fontSize: 11.5, fontWeight: 700 },
  table: { borderWidth: 1, borderColor: c.line, borderRadius: 8, overflow: "hidden", marginBottom: 10 },
  tHead: { flexDirection: "row", backgroundColor: "#111924", borderBottomWidth: 1, borderBottomColor: c.line, paddingVertical: 8, paddingHorizontal: 10 },
  tRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: c.line, paddingVertical: 7, paddingHorizontal: 10 },
  tCellHead: { fontSize: 8.3, color: c.mute, textTransform: "uppercase", letterSpacing: 0.7 },
  tCell: { fontSize: 9.8, color: c.text },
  w20: { width: "20%" },
  w25: { width: "25%" },
  w30: { width: "30%" },
  w40: { width: "40%" },
  digestWrap: { borderWidth: 1, borderColor: "#1D3D44", backgroundColor: "#0B171B", borderRadius: 8, padding: 10 },
  digestItem: { marginBottom: 6, color: c.dim, lineHeight: 1.4 },
  foot: { marginTop: 12, fontSize: 8.6, color: c.mute, textAlign: "right" },
});

function num(v: number) {
  return new Intl.NumberFormat("en-US").format(v);
}

export function InsightsReportDocument({ data }: { data: InsightsReportData }) {
  return (
    <Document title={`Inovense Insights - ${data.workspace}`}>
      <Page size="A4" style={s.page}>
        <Text style={s.eyebrow}>Inovense OS · Insights Export</Text>
        <Text style={s.h1}>Performance Report</Text>
        <Text style={s.sub}>{data.workspace} · {data.periodLabel} · Generated {new Date(data.generatedAt).toLocaleString("en-GB")}</Text>

        <View style={s.row}>
          {data.kpis.slice(0, 2).map((k) => (
            <View key={k.label} style={s.card}>
              <Text style={s.cardLabel}>{k.label}</Text>
              <Text style={s.cardValue}>{k.value}</Text>
              <Text style={s.cardDelta}>{k.delta}</Text>
            </View>
          ))}
        </View>
        <View style={s.row}>
          {data.kpis.slice(2, 4).map((k) => (
            <View key={k.label} style={s.card}>
              <Text style={s.cardLabel}>{k.label}</Text>
              <Text style={s.cardValue}>{k.value}</Text>
              <Text style={s.cardDelta}>{k.delta}</Text>
            </View>
          ))}
        </View>

        <Text style={s.section}>Weekly Trends</Text>
        <View style={s.table}>
          <View style={s.tHead}>
            <Text style={[s.tCellHead, s.w20]}>Week</Text>
            <Text style={[s.tCellHead, s.w40]}>Actions</Text>
            <Text style={[s.tCellHead, s.w40]}>Hours Saved</Text>
          </View>
          {data.weeklyActions.map((w, i) => (
            <View key={w.label} style={s.tRow}>
              <Text style={[s.tCell, s.w20]}>{w.label}</Text>
              <Text style={[s.tCell, s.w40]}>{num(w.val)}</Text>
              <Text style={[s.tCell, s.w40]}>{num(data.weeklyHoursSaved[i]?.val ?? 0)}h</Text>
            </View>
          ))}
        </View>

        <Text style={s.section}>Operator Performance</Text>
        <View style={s.table}>
          <View style={s.tHead}>
            <Text style={[s.tCellHead, s.w30]}>Operator</Text>
            <Text style={[s.tCellHead, s.w25]}>Actions</Text>
            <Text style={[s.tCellHead, s.w25]}>Outputs</Text>
            <Text style={[s.tCellHead, s.w20]}>Success</Text>
          </View>
          {data.operators.map((o) => (
            <View key={o.name} style={s.tRow}>
              <Text style={[s.tCell, s.w30]}>{o.name}</Text>
              <Text style={[s.tCell, s.w25]}>{num(o.actions)}</Text>
              <Text style={[s.tCell, s.w25]}>{num(o.outputs)}</Text>
              <Text style={[s.tCell, s.w20]}>{o.success}%</Text>
            </View>
          ))}
        </View>

        <Text style={s.section}>Key Shifts This Period</Text>
        <View style={s.digestWrap}>
          <Text style={s.digestItem}>• Pipeline velocity improved with higher proposal-stage throughput.</Text>
          <Text style={s.digestItem}>• Output volume increased while maintaining high approval quality.</Text>
          <Text style={s.digestItem}>• Operating overhead reduced through automation consistency.</Text>
        </View>

        <Text style={s.foot}>Inovense OS · Confidential internal performance report</Text>
      </Page>
    </Document>
  );
}

