import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { TimelineEntry, TimelineKind } from "@/components/TimelineEntry";
import { useColors } from "@/hooks/useColors";
import { useHealth } from "@/contexts/HealthContext";

type FilterKey = "all" | "visit" | "lab" | "med" | "alert";

interface TimelineItem {
  id: string;
  kind: TimelineKind;
  title: string;
  subtitle?: string;
  detail?: string;
  date: string;
}

export default function TimelineScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state } = useHealth();
  const [filter, setFilter] = useState<FilterKey>("all");

  const items = useMemo<TimelineItem[]>(() => {
    const list: TimelineItem[] = [];

    state.visits.forEach((v) =>
      list.push({
        id: `v-${v.id}`,
        kind: "visit",
        title: v.doctor,
        subtitle: v.hospital,
        detail: v.notes,
        date: v.date,
      }),
    );

    const grouped = new Map<string, typeof state.labs>();
    state.labs.forEach((l) => {
      const key = `${l.documentId ?? l.date}`;
      const arr = grouped.get(key) ?? [];
      arr.push(l);
      grouped.set(key, arr);
    });
    grouped.forEach((labs, key) => {
      const abnormal = labs.filter((l) => l.status !== "NORMAL");
      list.push({
        id: `lab-${key}`,
        kind: "lab",
        title: `${labs.length} lab result${labs.length === 1 ? "" : "s"}`,
        subtitle:
          abnormal.length > 0
            ? `${abnormal.length} flagged abnormal`
            : "All within range",
        detail: labs
          .slice(0, 4)
          .map((l) => `${l.name}: ${l.value} ${l.unit}`)
          .join(" · "),
        date: labs[0]!.date,
      });
    });

    state.medications.forEach((m) =>
      list.push({
        id: `m-${m.id}`,
        kind: "med",
        title: `${m.name} ${m.dose}`,
        subtitle: `${m.frequency} · ${m.prescribedBy ?? "Self"}`,
        date: m.startDate,
      }),
    );

    state.alerts.forEach((a) =>
      list.push({
        id: `a-${a.id}`,
        kind: "alert",
        title: a.title,
        detail: a.description,
        date: a.createdAt,
      }),
    );

    return list.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [state]);

  const filtered = items.filter((i) => filter === "all" || i.kind === filter);
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomPad = Platform.OS === "web" ? 110 : 100;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12 + webTopInset,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Timeline</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Every visit, lab, prescription and alert
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: webBottomPad }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        <View style={[styles.filterBar, { backgroundColor: colors.background }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {(
              [
                { key: "all", label: "All" },
                { key: "visit", label: "Visits" },
                { key: "lab", label: "Labs" },
                { key: "med", label: "Meds" },
                { key: "alert", label: "Alerts" },
              ] as { key: FilterKey; label: string }[]
            ).map((f) => {
              const active = filter === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primary : colors.card,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? colors.primaryForeground : colors.foreground },
                    ]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          {filtered.length === 0 ? (
            <EmptyState
              icon="clock"
              title="Nothing here yet"
              description="Add a report from the Add tab to start your health timeline."
            />
          ) : (
            filtered.map((item, idx) => (
              <TimelineEntry
                key={item.id}
                kind={item.kind}
                title={item.title}
                subtitle={item.subtitle}
                detail={item.detail}
                date={item.date}
                isLast={idx === filtered.length - 1}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontFamily: "DMSerifDisplay_400Regular",
    fontSize: 28,
    letterSpacing: -0.5,
  },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  filterBar: { paddingVertical: 10, paddingHorizontal: 0 },
  filterRow: { paddingHorizontal: 16, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontFamily: "Inter_500Medium", fontSize: 12 },
});
