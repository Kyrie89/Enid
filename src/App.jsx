import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Papa from "papaparse";
import {
  Search, Plus, X, Phone, Link2, ChevronRight, SlidersHorizontal, Tag, Filter,
  Clock, Share2, BarChart3, Printer, Download, Upload, UserCog, ChevronLeft, Users,
  MoreHorizontal,
} from "lucide-react";

import { supabase } from "./supabaseClient";
import { CATEGORY_META, ISSUE_TAG_GROUPS, BARRIER_TAGS, QUICK_REQUIREMENT_TAGS, DAYS, DAY_SHORT } from "./lib/taxonomy";
import { uid, findLikelyDuplicate, timeToMinutes, fuzzyScore, expandSearchQuery } from "./lib/utils";
import { SEARCH_SYNONYMS } from "./lib/searchSynonyms";
import { S } from "./styles";

import { CatChip, TagChip } from "./components/shared";
import { NetworkView } from "./components/NetworkView";
import { InsightsPanel } from "./components/InsightsPanel";
import { DetailView } from "./components/DetailView";
import { EditForm } from "./components/EditForm";

const emptyDraft = () => ({
  id: uid(), name: "", category: "treatment", secondaryCategories: [], subcategory: "", address: "", phone: "",
  website: "", populations: "", exclusions: "", insurance: "", notes: "", schedule: [], locations: [], issues: [], barriers: [],
  connections: [], verifiedDate: null, status: "active", editedBy: "", editedDate: null,
  city: "", isStatewide: false, isCountywide: false, ageMin: null, ageMax: null, parentOrg: "",
});

const PRINT_FIELD_OPTIONS = [
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "website", label: "Website" },
  { key: "insurance", label: "Insurance / cost" },
  { key: "populations", label: "Population served" },
  { key: "issues", label: "Issues addressed" },
  { key: "barriers", label: "Barriers removed" },
  { key: "notes", label: "Notes" },
];

const CLIENT_QUICK_NEEDS = [
  { label: "Somewhere safe tonight", issues: ["Crisis / emergency"] },
  { label: "Food today", issues: ["Food"] },
  { label: "Rent or utility help", issues: ["Housing / rent", "Utilities"] },
  { label: "Medical care or medication", issues: ["Medical care"] },
  { label: "Mental-health help", issues: ["Mental health"] },
  { label: "Substance-use treatment", issues: ["Substance use"] },
  { label: "A sober place to live", issues: ["Sober living / recovery housing"] },
  { label: "Work, benefits, or ID", issues: ["Employment", "Government benefits", "ID & documents"] },
  { label: "Legal help", issues: ["Legal / court"] },
  { label: "Transportation", issues: ["Transportation"] },
  { label: "Help for my child or family", issues: ["Childcare", "Youth activities"] },
  { label: "Someone to talk to", issues: ["Grief / loss support", "Mental health"] },
];

/* ---------------- app ---------------- */
export default function App() {
  const [resources, setResources] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const [issueFilters, setIssueFilters] = useState([]);
  const [barrierFilters, setBarrierFilters] = useState([]);
  const [ageFilter, setAgeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [connectPicker, setConnectPicker] = useState(false);
  const [toast, setToast] = useState("");
  const [viewMode, setViewMode] = useState("browse"); // "browse" | "day" | "network"
  const [selectedDay, setSelectedDay] = useState(DAYS[new Date().getDay()]);
  const [showClosed, setShowClosed] = useState(false);
  const [locationFilter, setLocationFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("local"); // "local" | "regional" | "all"
  const lang = "en"; // TEMP: language toggle removed since resource content itself doesn't translate
  const [showInsights, setShowInsights] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef(null);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [printSingleMode, setPrintSingleMode] = useState(false);
  const [printFields, setPrintFields] = useState({ phone: true, address: true, website: false, insurance: false, populations: false, issues: false, barriers: false, notes: false });
  const [savedViews, setSavedViews] = useState([]);
  const [savingViewName, setSavingViewName] = useState("");
  const [audienceMode, setAudienceMode] = useState("staff"); // "staff" | "client"
  const [session, setSession] = useState(null);
  const [editorProfile, setEditorProfile] = useState(null);
  const fileInputRef = useRef(null);

  const isEditor = true; // TEMP: auth disabled while populating content — restore !!editorProfile before real launch
  // With sign-in removed, editorProfile.display_name is dead — nothing sets a session
  // anymore, so every edit was silently attributed "Unattributed" with no way to fix it.
  // A remembered local name restores real attribution without needing auth back.
  const [editorName, setEditorName] = useState(() => { try { return localStorage.getItem("enid_editor_name") || ""; } catch { return ""; } });
  useEffect(() => { try { localStorage.setItem("enid_editor_name", editorName); } catch {} }, [editorName]);
  const editorDisplayName = editorName.trim() || editorProfile?.display_name || "";

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }, []);

  const printResource = useCallback(() => {
    setPrintSingleMode(true);
    const reset = () => setPrintSingleMode(false);
    window.addEventListener("afterprint", reset, { once: true });
    requestAnimationFrame(() => window.print());
  }, []);

  /* ---- auth ---- */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setEditorProfile(null);
      return;
    }
    let ignore = false;
    (async () => {
      const { data } = await supabase.from("editors").select("*").eq("id", session.user.id).maybeSingle();
      if (!ignore) setEditorProfile(data || null);
    })();
    return () => { ignore = true; };
  }, [session]);

  /* ---- resources / schedule / connections / locations ---- */
  const fetchResources = useCallback(async () => {
    const [
      { data: resourcesData, error: rErr },
      { data: scheduleData, error: sErr },
      { data: connectionsData, error: cErr },
      { data: locationsData, error: lErr },
    ] = await Promise.all([
      supabase.from("resources").select("*"),
      supabase.from("schedule").select("*"),
      supabase.from("connections").select("*"),
      supabase.from("locations").select("*"),
    ]);
    if (rErr || sErr || cErr || lErr) {
      showToast("Couldn't load resources — try refreshing");
      return;
    }
    const merged = resourcesData.map((r) => ({
      ...r,
      secondaryCategories: r.secondary_categories,
      verifiedDate: r.verified_date,
      editedBy: r.edited_by,
      editedDate: r.edited_date,
      isStatewide: r.is_statewide,
      isCountywide: r.is_countywide,
      ageMin: r.age_min,
      ageMax: r.age_max,
      parentOrg: r.parent_org,
      schedule: scheduleData.filter((s) => s.resource_id === r.id),
      connections: connectionsData.filter((c) => c.resource_id === r.id).map((c) => c.connected_resource_id),
      locations: locationsData.filter((l) => l.resource_id === r.id),
    }));
    setResources(merged);
  }, [showToast]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchResources();
      setLoading(false);
    })();
    // Refetch when auth identity changes — closed-resource visibility depends on it (see schema.sql).
  }, [session?.user?.id, fetchResources]);

  /* ---- saved views ---- */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("saved_views").select("*").order("created_at", { ascending: true });
      if (!error) setSavedViews(data || []);
    })();
  }, []);

  useEffect(() => {
    if (audienceMode === "client" && viewMode === "network") setViewMode("browse");
  }, [audienceMode, viewMode]);

  // Jump to the top when opening a detail/edit view so mobile doesn't land mid-scroll.
  useEffect(() => {
    if (selectedId || editing) {
      try { window.scrollTo({ top: 0, behavior: "instant" }); } catch (e) { window.scrollTo(0, 0); }
    }
  }, [selectedId, editing?.id]);

  useEffect(() => {
    if (!showMoreMenu) return;
    const onClick = (e) => { if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) setShowMoreMenu(false); };
    const onKey = (e) => { if (e.key === "Escape") setShowMoreMenu(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [showMoreMenu]);

  const cities = useMemo(() => {
    if (!resources) return [];
    const set = new Set(resources.filter((r) => !r.isStatewide && !r.isCountywide && r.city).map((r) => r.city));
    return [...set].sort();
  }, [resources]);

  // Regional/national and countywide resources aren't tied to one city, so they
  // ignore the location filter and always show up once their scope is included.
  const inScope = useCallback((r) => (
    scopeFilter === "local" ? !r.isStatewide : scopeFilter === "regional" ? r.isStatewide : true
  ), [scopeFilter]);
  const inLocation = useCallback((r) => (
    r.isStatewide || r.isCountywide || locationFilter === "all" || r.city === locationFilter
  ), [locationFilter]);
  // A resource with no age_min/age_max set has no age restriction, so it always matches.
  const inAge = useCallback((r) => {
    if (ageFilter === "" || ageFilter == null) return true;
    const age = Number(ageFilter);
    if (r.ageMin != null && age < r.ageMin) return false;
    if (r.ageMax != null && age > r.ageMax) return false;
    return true;
  }, [ageFilter]);

  const { list: filtered, kind: searchMatchKind } = useMemo(() => {
    if (!resources) return { list: [], kind: null };
    const q = query.trim().toLowerCase();
    const catMatch = (r) => activeCat === "all" || r.category === activeCat || (r.secondaryCategories || []).includes(activeCat);
    const base = resources.filter((r) => {
      if (!showClosed && r.status === "closed") return false;
      if (!inScope(r) || !inLocation(r) || !inAge(r)) return false;
      if (!catMatch(r)) return false;
      if (issueFilters.length && !issueFilters.some((i) => r.issues?.includes(i))) return false;
      if (barrierFilters.length && !barrierFilters.some((b) => r.barriers?.includes(b))) return false;
      return true;
    });
    if (!q) return { list: base.sort((a, b) => a.name.localeCompare(b.name)), kind: null };

    const hayOf = (r) =>
      [
        r.name, r.subcategory, r.address, r.populations, r.insurance, r.notes,
        ...(r.issues || []), ...(r.barriers || []),
        ...(r.locations || []).flatMap((l) => [l.label, l.address]),
      ]
        .join(" ")
        .toLowerCase();

    // Everyday phrasing and professional jargon both find the same resources —
    // "rehab" and "residential treatment" search the same haystack.
    const queryVariants = [q, ...expandSearchQuery(q, SEARCH_SYNONYMS)];

    const exact = base.filter((r) => { const hay = hayOf(r); return queryVariants.some((v) => hay.includes(v)); });
    if (exact.length > 0) {
      const matchedRawQuery = exact.some((r) => hayOf(r).includes(q));
      return { list: exact.sort((a, b) => a.name.localeCompare(b.name)), kind: matchedRawQuery ? "exact" : "synonym" };
    }

    // Fuzzy fallback: word-level typo tolerance across the query and any synonym expansions,
    // so a no-exact-match search still surfaces related results instead of a dead end.
    const fuzzy = base
      .map((r) => {
        const hay = hayOf(r);
        const scores = queryVariants.map((v) => fuzzyScore(hay, v)).filter((s) => s !== null);
        return scores.length ? { r, score: Math.min(...scores) } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score)
      .map((x) => x.r);
    return { list: fuzzy, kind: fuzzy.length > 0 ? "fuzzy" : null };
  }, [resources, query, activeCat, issueFilters, barrierFilters, showClosed, inScope, inLocation, inAge]);

  const selected = resources?.find((r) => r.id === selectedId) || null;
  const activeFilterCount = issueFilters.length + barrierFilters.length + (ageFilter !== "" ? 1 : 0);

  // Log searches that return zero results — surfaces demand gaps for the coalition.
  useEffect(() => {
    const q = query.trim();
    if (!resources || q.length < 3 || filtered.length > 0) return;
    const t = setTimeout(async () => {
      const term = q.toLowerCase();
      const { data: existing } = await supabase.from("search_misses").select("hit_count").eq("term", term).maybeSingle();
      if (existing) {
        await supabase.from("search_misses").update({ hit_count: existing.hit_count + 1, last_searched: new Date().toISOString() }).eq("term", term);
      } else {
        await supabase.from("search_misses").insert({ term });
      }
    }, 1200); // debounce so we only log once someone pauses typing
    return () => clearTimeout(t);
  }, [query, filtered.length, resources]);

  const dayOccurrences = useMemo(() => {
    if (!resources) return [];
    const list = [];
    resources.forEach((r) => {
      if (!showClosed && r.status === "closed") return;
      if (!inScope(r) || !inLocation(r) || !inAge(r)) return;
      (r.schedule || []).forEach((occ) => {
        if (occ.day === selectedDay) list.push({ ...occ, resource: r });
      });
    });
    return list.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  }, [resources, selectedDay, showClosed, inScope, inLocation, inAge]);

  const toggleFilter = (list, setList, val) => {
    setList(list.includes(val) ? list.filter((v) => v !== val) : [...list, val]);
  };

  const saveCurrentView = async () => {
    const name = savingViewName.trim();
    if (!name) return;
    const { data, error } = await supabase
      .from("saved_views")
      .insert({
        name, query, active_category: activeCat, issue_filters: issueFilters, barrier_filters: barrierFilters,
        created_by: editorDisplayName,
      })
      .select()
      .single();
    if (error) { showToast("Couldn't save that view — try again"); return; }
    setSavedViews((prev) => [...prev, data]);
    setSavingViewName("");
    showToast("View saved");
  };

  const applySavedView = (view) => {
    setQuery(view.query || "");
    setActiveCat(view.active_category || "all");
    setIssueFilters(view.issue_filters || []);
    setBarrierFilters(view.barrier_filters || []);
    setViewMode("browse");
  };

  const deleteSavedView = async (id) => {
    const { error } = await supabase.from("saved_views").delete().eq("id", id);
    if (error) { showToast("Couldn't delete that view"); return; }
    setSavedViews((prev) => prev.filter((v) => v.id !== id));
  };

  const saveDraft = async (force) => {
    if (!isEditor) { showToast("You need editor access to save"); return; }
    if (!editing.name.trim()) { showToast("Name is required"); return; }
    const exists = resources.some((r) => r.id === editing.id);
    if (!exists && !force) {
      const dupe = findLikelyDuplicate(resources, editing.name, editing.id);
      if (dupe) {
        const proceed = window.confirm(
          `This looks similar to an existing entry: "${dupe.name}".\n\nSave as a new, separate resource anyway? (Cancel to go edit "${dupe.name}" instead.)`
        );
        if (!proceed) {
          setSelectedId(dupe.id);
          setEditing(null);
          return;
        }
      }
    }
    const stamped = { ...editing, editedBy: editorDisplayName || "Unattributed", editedDate: new Date().toISOString().slice(0, 10) };
    const { schedule, connections, locations, secondaryCategories, verifiedDate, editedBy, editedDate, isStatewide, isCountywide, ageMin, ageMax, parentOrg, ...rest } = stamped;

    const { error: resourceError } = await supabase.from("resources").upsert({
      ...rest,
      secondary_categories: secondaryCategories || [],
      verified_date: verifiedDate,
      edited_by: editedBy,
      edited_date: editedDate,
      is_statewide: isStatewide,
      is_countywide: isCountywide,
      age_min: ageMin,
      age_max: ageMax,
      parent_org: parentOrg,
    });
    if (resourceError) { showToast("Couldn't save — try again"); return; }

    await supabase.from("schedule").delete().eq("resource_id", stamped.id);
    if (schedule?.length) {
      await supabase.from("schedule").insert(
        schedule.map((s) => ({ resource_id: stamped.id, day: s.day, time: s.time, label: s.label, frequency: s.frequency }))
      );
    }

    await supabase.from("connections").delete().eq("resource_id", stamped.id);
    if (connections?.length) {
      await supabase.from("connections").insert(
        connections.map((cid) => ({ resource_id: stamped.id, connected_resource_id: cid }))
      );
    }

    await supabase.from("locations").delete().eq("resource_id", stamped.id);
    if (locations?.length) {
      await supabase.from("locations").insert(
        locations.map((l) => ({ resource_id: stamped.id, label: l.label, address: l.address, phone: l.phone, notes: l.notes }))
      );
    }

    await fetchResources();
    setSelectedId(stamped.id);
    setEditing(null);
    showToast("Saved");
  };

  const closeResource = async (id) => {
    if (!isEditor) return;
    const { error } = await supabase.from("resources").update({
      status: "closed",
      edited_by: editorDisplayName || "Unattributed",
      edited_date: new Date().toISOString().slice(0, 10),
    }).eq("id", id);
    if (error) { showToast("Couldn't update — try again"); return; }
    await fetchResources();
    showToast("Marked closed");
  };

  const deleteResource = async (id) => {
    if (!isEditor) return;
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) { showToast("Couldn't delete — try again"); return; }
    await fetchResources();
    setSelectedId(null);
    showToast("Deleted");
  };

  const exportCSV = () => {
    const rows = resources.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      secondaryCategories: (r.secondaryCategories || []).join(" | "),
      subcategory: r.subcategory || "",
      city: r.city || "",
      isStatewide: r.isStatewide ? "yes" : "",
      isCountywide: r.isCountywide ? "yes" : "",
      ageMin: r.ageMin ?? "",
      ageMax: r.ageMax ?? "",
      parentOrg: r.parentOrg || "",
      address: r.address || "",
      phone: r.phone || "",
      website: r.website || "",
      populations: r.populations || "",
      exclusions: r.exclusions || "",
      insurance: r.insurance || "",
      notes: r.notes || "",
      issues: (r.issues || []).join(" | "),
      barriers: (r.barriers || []).join(" | "),
      connections: (r.connections || []).join(" | "),
      schedule: (r.schedule || []).map((s) => `${s.day}@${s.time}@${s.label}@${s.frequency}`).join(" ; "),
      locations: (r.locations || []).map((l) => `${l.label}@${l.address}@${l.phone}@${l.notes}`).join(" ; "),
      verifiedDate: r.verifiedDate || "",
      status: r.status || "active",
      editedBy: r.editedBy || "",
      editedDate: r.editedDate || "",
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enid-resources-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("CSV exported — check your downloads");
  };

  const importCSV = (file) => {
    if (!isEditor) { showToast("You need editor access to import"); return; }
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const splitList = (v) => (v || "").split("|").map((s) => s.trim()).filter(Boolean);
        const imported = results.data
          .map((row) => ({
            id: uid(),
            name: (row.name || "").trim(),
            category: CATEGORY_META[row.category] ? row.category : "housing",
            secondaryCategories: splitList(row.secondaryCategories),
            subcategory: row.subcategory || "",
            city: row.city || "",
            isStatewide: (row.isStatewide || "").trim().toLowerCase() === "yes",
            isCountywide: (row.isCountywide || "").trim().toLowerCase() === "yes",
            ageMin: row.ageMin?.trim() ? Number(row.ageMin) : null,
            ageMax: row.ageMax?.trim() ? Number(row.ageMax) : null,
            parentOrg: row.parentOrg || "",
            address: row.address || "",
            phone: row.phone || "",
            website: row.website || "",
            populations: row.populations || "",
            exclusions: row.exclusions || "",
            insurance: row.insurance || "",
            notes: row.notes || "",
            issues: splitList(row.issues),
            barriers: splitList(row.barriers),
            schedule: (row.schedule || "").split(";").map((s) => s.trim()).filter(Boolean).map((chunk) => {
              const [day, time, label, frequency] = chunk.split("@");
              return { day: day || "Monday", time: time || "", label: label || "", frequency: frequency || "Weekly" };
            }),
            locations: (row.locations || "").split(";").map((s) => s.trim()).filter(Boolean).map((chunk) => {
              const [label, address, phone, notes] = chunk.split("@");
              return { label: label || "", address: address || "", phone: phone || "", notes: notes || "" };
            }),
            // Connections reference internal IDs from the source file that won't match here —
            // left blank intentionally rather than silently pointing at the wrong resource.
            status: "active",
            editedBy: editorDisplayName || "CSV import",
            editedDate: new Date().toISOString().slice(0, 10),
          }))
          .filter((r) => r.name);
        if (imported.length === 0) {
          showToast("No valid rows found — check the 'name' column exists");
          return;
        }
        for (const r of imported) {
          const { schedule, locations, secondaryCategories, editedBy, editedDate, isStatewide, isCountywide, ageMin, ageMax, parentOrg, ...rest } = r;
          const { error } = await supabase.from("resources").insert({
            ...rest,
            secondary_categories: secondaryCategories,
            edited_by: editedBy,
            edited_date: editedDate,
            is_statewide: isStatewide,
            is_countywide: isCountywide,
            age_min: ageMin,
            age_max: ageMax,
            parent_org: parentOrg,
          });
          if (error) continue;
          if (schedule.length) {
            await supabase.from("schedule").insert(schedule.map((s) => ({ resource_id: r.id, ...s })));
          }
          if (locations.length) {
            await supabase.from("locations").insert(locations.map((l) => ({ resource_id: r.id, ...l })));
          }
        }
        await fetchResources();
        showToast(`Imported ${imported.length} resource${imported.length === 1 ? "" : "s"} — review before trusting them`);
      },
      error: () => showToast("Couldn't read that CSV"),
    });
  };

  const toggleConnection = (otherId) => {
    if (!editing) return;
    const has = editing.connections.includes(otherId);
    setEditing({ ...editing, connections: has ? editing.connections.filter((c) => c !== otherId) : [...editing.connections, otherId] });
  };

  const toggleDraftTag = (field, val) => {
    const list = editing[field] || [];
    setEditing({ ...editing, [field]: list.includes(val) ? list.filter((v) => v !== val) : [...list, val] });
  };

  if (loading) {
    return (
      <div style={S.loadingWrap}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={S.loadingSpin} />
      </div>
    );
  }

  return (
    <div style={S.app} className="app-root">
      <style>{`
        * { box-sizing: border-box; }
        input, textarea, select { font-family: inherit; }
        ::placeholder { color: #9aa0a6; }
        button { cursor: pointer; }
        button:not(:disabled) { transition: filter 0.12s ease, background-color 0.12s ease; }
        button:not(:disabled):hover { filter: brightness(0.95); }
        a:hover { opacity: 0.82; }
        .listPane button:not([aria-current="true"]):hover { background-color: #f6f4ee !important; filter: none; }
        button[role="tab"][aria-selected="false"]:hover { background-color: rgba(255,255,255,0.65) !important; filter: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 720px) {
          .split { flex-direction: column !important; }
          .listPane { width: 100% !important; max-width: 100% !important; border-right: none !important; max-height: 45vh !important; }
          .mobile-back { display: none; }
          .split.has-detail .listPane { display: none !important; }
          .split.has-detail .mobile-back { display: flex !important; }
          .split.has-detail .detailPane { max-height: none !important; }
          .utility-row { flex-wrap: wrap; row-gap: 10px; }
          .utility-row .segment-group { width: 100%; }
        }
        @media print {
          .app-root { min-height: 0 !important; }
          .no-print { display: none !important; }
          .listPane { max-height: none !important; overflow: visible !important; width: 100% !important; max-width: 100% !important; border: none !important; }
          .split { flex-direction: column !important; max-width: 100% !important; }
          .detailPane { display: none !important; }
          .print-item { break-inside: avoid; border-bottom: 1px solid #ccc !important; padding: 10px 0 !important; }
          .print-only { display: block !important; }
          .split.print-single .listPane { display: none !important; }
          .split.print-single .detailPane { display: block !important; }
        }
      `}</style>

      <header style={S.header}>
      <div style={S.headerContent}>
        <div style={S.headerInner}>
          <div>
            <div style={S.eyebrow}>{audienceMode === "client" ? (lang === "es" ? "ENID, OK · OBTENER AYUDA" : "ENID, OK · GET HELP") : "ENID, OK · RESOURCE NETWORK"}</div>
            <h1 style={S.h1}>
              {audienceMode === "client"
                ? (lang === "es" ? "¿Qué necesitas hoy?" : "What do you need today?")
                : (lang === "es" ? "Averigüe quién ayuda a quién, con qué, cuándo." : "Find out who helps who, with what, when.")}
            </h1>
            {audienceMode === "client" && (
              <div style={S.clientSubhead}>Choose a need below, or describe what you're looking for.</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }} className="no-print">
            {audienceMode === "staff" && isEditor && (
              <button style={S.addBtn} onClick={() => { setEditing(emptyDraft()); setSelectedId(null); }} aria-label="Add a new resource">
                <Plus size={16} /> {lang === "es" ? "Añadir" : "Add"}
              </button>
            )}
            <button
              style={{ ...S.utilBtn, width: "auto", padding: "0 12px", gap: 6 }}
              onClick={() => setAudienceMode(audienceMode === "staff" ? "client" : "staff")}
              aria-label={audienceMode === "staff" ? "Switch to client view" : "Switch to staff view"}
            >
              <UserCog size={14} /> {audienceMode === "staff" ? "Client view" : "Staff view"}
            </button>
          </div>
        </div>

        {audienceMode === "staff" && (
          <div style={S.utilityRow} className="no-print utility-row">
            <div style={S.segmentGroup} className="segment-group" role="tablist" aria-label="View mode">
              <button role="tab" aria-selected={viewMode === "browse"} style={{ ...S.segmentBtn, ...(viewMode === "browse" ? S.segmentBtnActive : {}) }} onClick={() => setViewMode("browse")}>List</button>
              <button role="tab" aria-selected={viewMode === "day"} style={{ ...S.segmentBtn, ...(viewMode === "day" ? S.segmentBtnActive : {}) }} onClick={() => setViewMode("day")}><Clock size={12} /> By Day</button>
              <button role="tab" aria-selected={viewMode === "network"} style={{ ...S.segmentBtn, ...(viewMode === "network" ? S.segmentBtnActive : {}) }} onClick={() => setViewMode("network")}><Share2 size={12} /> Network</button>
            </div>
            <div style={{ position: "relative" }} ref={moreMenuRef}>
              <button
                style={S.utilBtn}
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                aria-label="More actions"
                aria-haspopup="true"
                aria-expanded={showMoreMenu}
              >
                <MoreHorizontal size={14} />
              </button>
              {showMoreMenu && (
                <div style={S.moreMenu} role="menu">
                  <button role="menuitem" style={S.moreMenuItem} onClick={() => { setShowInsights(true); setShowMoreMenu(false); }}><BarChart3 size={14} /> Insights</button>
                  <button role="menuitem" style={S.moreMenuItem} onClick={() => { setShowPrintOptions(true); setShowMoreMenu(false); }}><Printer size={14} /> Print</button>
                  <button role="menuitem" style={S.moreMenuItem} onClick={() => { exportCSV(); setShowMoreMenu(false); }}><Download size={14} /> Export CSV</button>
                  {isEditor && (
                    <button role="menuitem" style={S.moreMenuItem} onClick={() => { fileInputRef.current?.click(); setShowMoreMenu(false); }}><Upload size={14} /> Import CSV</button>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                style={{ display: "none" }}
                onChange={(e) => { if (e.target.files?.[0]) importCSV(e.target.files[0]); e.target.value = ""; }}
              />
            </div>
          </div>
        )}

        {viewMode === "day" ? (
          <div style={S.chipRow}>
            {DAYS.map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                aria-label={d}
                aria-pressed={selectedDay === d}
                style={{
                  ...S.dayChip,
                  ...(selectedDay === d ? S.dayChipActive : {}),
                }}
              >
                {DAY_SHORT[d]}
              </button>
            ))}
          </div>
        ) : (
          <>
            <div style={S.searchRow}>
              <div style={S.searchBox}>
                <Search size={16} color="#6b7280" />
                <input
                  style={S.searchInput}
                  placeholder={scopeFilter === "regional" ? "Search regional & national services, hotlines, and out-of-area connections..." : "Search by name, insurance, issue, barrier..."}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && <button style={S.clearBtn} onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}
              </div>
              <button
                style={{ ...S.filterToggle, ...(activeFilterCount ? S.filterToggleActive : {}) }}
                onClick={() => setShowFilters(!showFilters)}
                aria-label="Toggle more filters"
                aria-expanded={showFilters}
              >
                <SlidersHorizontal size={15} />
                <span>More Filters</span>
                {activeFilterCount > 0 && <span style={S.filterBadge}>{activeFilterCount}</span>}
              </button>
            </div>

            {!showFilters && activeFilterCount > 0 && (
              <div style={S.activeFilterSummary} aria-label="Active filters">
                {issueFilters.map((t) => (
                  <div key={"if_" + t} style={S.activeFilterChip}>
                    <span style={S.activeFilterChipLabel}>{t}</span>
                    <button style={S.activeFilterChipRemove} onClick={() => toggleFilter(issueFilters, setIssueFilters, t)} aria-label={`Remove filter ${t}`}><X size={11} /></button>
                  </div>
                ))}
                {barrierFilters.map((t) => (
                  <div key={"bf_" + t} style={S.activeFilterChip}>
                    <span style={S.activeFilterChipLabel}>{t}</span>
                    <button style={S.activeFilterChipRemove} onClick={() => toggleFilter(barrierFilters, setBarrierFilters, t)} aria-label={`Remove filter ${t}`}><X size={11} /></button>
                  </div>
                ))}
                {ageFilter !== "" && (
                  <div style={S.activeFilterChip}>
                    <span style={S.activeFilterChipLabel}>Age {ageFilter}</span>
                    <button style={S.activeFilterChipRemove} onClick={() => setAgeFilter("")} aria-label="Remove age filter"><X size={11} /></button>
                  </div>
                )}
                <button style={S.clearFiltersBtn} onClick={() => { setIssueFilters([]); setBarrierFilters([]); setAgeFilter(""); }}>Clear all</button>
              </div>
            )}

            {audienceMode === "client" && activeCat === "all" && issueFilters.length === 0 && !query.trim() && (
              <div style={S.quickNeedGrid}>
                {CLIENT_QUICK_NEEDS.map((need) => (
                  <button
                    key={need.label}
                    style={S.quickNeedBtn}
                    onClick={() => { setIssueFilters(need.issues); setActiveCat("all"); setQuery(""); }}
                  >
                    {need.label}
                  </button>
                ))}
              </div>
            )}

            {savedViews.length > 0 && (
              <div style={S.chipRow}>
                {savedViews.map((v) => (
                  <div key={v.id} style={S.savedViewChip}>
                    <button onClick={() => applySavedView(v)} style={S.savedViewBtn}>★ {v.name}</button>
                    {isEditor && (
                      <button onClick={() => deleteSavedView(v.id)} style={S.savedViewRemove} aria-label={`Delete saved view ${v.name}`}><X size={11} /></button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#6b7178", letterSpacing: 0.5 }}>SCOPE</label>
              <div style={S.segmentGroup} role="tablist" aria-label="Resource scope">
                <button role="tab" aria-selected={scopeFilter === "local"} style={{ ...S.segmentBtn, ...(scopeFilter === "local" ? S.segmentBtnActive : {}) }} onClick={() => setScopeFilter("local")}>Local Only</button>
                <button role="tab" aria-selected={scopeFilter === "regional"} style={{ ...S.segmentBtn, ...(scopeFilter === "regional" ? S.segmentBtnActive : {}) }} onClick={() => setScopeFilter("regional")}>Regional & National</button>
                <button role="tab" aria-selected={scopeFilter === "all"} style={{ ...S.segmentBtn, ...(scopeFilter === "all" ? S.segmentBtnActive : {}) }} onClick={() => setScopeFilter("all")}>All Resources</button>
              </div>

              {scopeFilter !== "regional" && cities.length > 1 && (
                <>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#6b7178", letterSpacing: 0.5, marginLeft: 8 }}>LOCATION</label>
                  <select
                    style={{ ...S.input, width: "auto", padding: "6px 10px", fontSize: 13 }}
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                  >
                    <option value="all">All towns ({resources.filter((r) => !r.isStatewide).length})</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>{c} ({resources.filter((r) => !r.isStatewide && r.city === c).length})</option>
                    ))}
                  </select>
                </>
              )}
            </div>

            <div style={S.categoryRow}>
              <CatChip active={activeCat === "all"} onClick={() => setActiveCat("all")} label="All" count={resources.filter((r) => (showClosed || r.status !== "closed") && inScope(r) && inLocation(r) && inAge(r)).length} />
              {Object.entries(CATEGORY_META).map(([key, meta]) => (
                <CatChip
                  key={key}
                  active={activeCat === key}
                  onClick={() => setActiveCat(key)}
                  label={meta.label}
                  count={resources.filter((r) => (showClosed || r.status !== "closed") && inScope(r) && inLocation(r) && inAge(r) && (r.category === key || (r.secondaryCategories || []).includes(key))).length}
                  color={meta.color}
                  Icon={meta.icon}
                />
              ))}
              {resources.some((r) => r.status === "closed") && (
                <button
                  onClick={() => setShowClosed(!showClosed)}
                  style={{ ...S.chip, borderColor: showClosed ? "#b3413a" : "#e4e2dc", background: showClosed ? "#b3413a14" : "#fff", color: showClosed ? "#b3413a" : "#5c6066" }}
                >
                  {showClosed ? "Hide closed" : "Show closed"} <span style={{ opacity: 0.6, marginLeft: 5 }}>{resources.filter((r) => r.status === "closed").length}</span>
                </button>
              )}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7178", letterSpacing: 0.5, marginBottom: 6, fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
              IMPORTANT REQUIREMENTS
            </div>
            <div style={S.quickReqRow}>
              {QUICK_REQUIREMENT_TAGS.map((t) => (
                <TagChip key={t} label={t} active={barrierFilters.includes(t)} onClick={() => toggleFilter(barrierFilters, setBarrierFilters, t)} />
              ))}
            </div>

            {showFilters && (
              <div style={S.filterPanel}>
                <div style={S.filterHint}>Selecting more than one option below matches resources with any of them, not only ones with all of them.</div>
                <div style={{ ...S.filterGroupLabel, marginTop: 12 }}><Tag size={12} /> ISSUE</div>
                {ISSUE_TAG_GROUPS.map((group) => (
                  <div key={group.label} style={{ marginBottom: 8 }}>
                    <div style={S.tagGroupLabel}>{group.label}</div>
                    <div style={S.tagWrap}>
                      {group.tags.map((t) => (
                        <TagChip key={t} label={t} active={issueFilters.includes(t)} onClick={() => toggleFilter(issueFilters, setIssueFilters, t)} />
                      ))}
                    </div>
                  </div>
                ))}
                <div style={{ ...S.filterGroupLabel, marginTop: 12 }}><Filter size={12} /> BARRIER IT ADDRESSES</div>
                <div style={S.tagWrap}>
                  {BARRIER_TAGS.map((t) => (
                    <TagChip key={t} label={t} active={barrierFilters.includes(t)} onClick={() => toggleFilter(barrierFilters, setBarrierFilters, t)} />
                  ))}
                </div>
                <div style={{ ...S.filterGroupLabel, marginTop: 12 }}><Users size={12} /> CLIENT'S AGE</div>
                <input
                  type="number"
                  min={0}
                  style={{ ...S.input, width: 100 }}
                  placeholder="Age"
                  value={ageFilter}
                  onChange={(e) => setAgeFilter(e.target.value)}
                />
                {activeFilterCount > 0 && (
                  <button style={S.clearFiltersBtn} onClick={() => { setIssueFilters([]); setBarrierFilters([]); setAgeFilter(""); }}>
                    Clear filters
                  </button>
                )}
                {(activeFilterCount > 0 || query.trim() || activeCat !== "all") && (
                  <div style={S.saveViewRow}>
                    <input
                      style={{ ...S.input, flex: 1 }}
                      placeholder="Name this view (e.g. 'Free youth summer programs')"
                      value={savingViewName}
                      onChange={(e) => setSavingViewName(e.target.value)}
                    />
                    <button style={S.connectPickerBtn} onClick={saveCurrentView}>Save view</button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      </header>

      <div className={`split ${(selected || editing) ? "has-detail" : ""} ${printSingleMode ? "print-single" : ""}`} style={{ ...S.split, ...(viewMode === "network" ? { flexDirection: "column" } : {}) }}>
        <div className="listPane" style={{ ...S.listPane, ...(viewMode === "network" ? { width: "100%", maxWidth: "100%", maxHeight: 560 } : {}) }}>
          {viewMode === "day" ? (
            <>
              <div style={S.dayHeading}>{selectedDay}</div>
              {dayOccurrences.length === 0 && (
                <div style={S.emptyState}>Nothing scheduled for {selectedDay} yet. Add a resource and give it a schedule entry for this day.</div>
              )}
              {dayOccurrences.map((occ, i) => {
                const meta = CATEGORY_META[occ.resource.category];
                const Icon = meta.icon;
                return (
                  <button
                    key={occ.resource.id + occ.id + i}
                    style={{ ...S.listItem, ...(selectedId === occ.resource.id ? S.listItemActive : {}), alignItems: "flex-start" }}
                    onClick={() => { setSelectedId(occ.resource.id); setEditing(null); }}
                    aria-current={selectedId === occ.resource.id ? "true" : undefined}
                  >
                    <div style={{ ...S.listIconWrap, background: meta.color + "1a", color: meta.color }}>
                      <Icon size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={S.occTime}>{occ.time}{occ.frequency && occ.frequency !== "Weekly" ? ` · ${occ.frequency}` : ""}</div>
                      <div style={S.listItemName}>{occ.resource.name}</div>
                      <div style={S.listItemSub}>{occ.label}</div>
                    </div>
                    <ChevronRight size={16} color="#c2c6cc" />
                  </button>
                );
              })}
            </>
          ) : viewMode === "network" ? (
            <NetworkView resources={filtered} onSelect={(id) => { setSelectedId(id); setEditing(null); }} selectedId={selectedId} />
          ) : (
            <>
              {filtered.length === 0 && (
                <div style={S.emptyState}>
                  {audienceMode === "client"
                    ? "We couldn't find an exact match. Try removing one filter, search nearby areas, or call 211 for help finding another option."
                    : "Nothing matches yet. Try different filters, or add this resource yourself."}
                </div>
              )}
              {filtered.length > 0 && searchMatchKind === "fuzzy" && (
                <div style={S.searchNotice}>No exact match for "{query.trim()}" — showing similar results.</div>
              )}
              {filtered.length > 0 && searchMatchKind === "synonym" && (
                <div style={S.searchNotice}>Showing results related to "{query.trim()}".</div>
              )}
              {filtered.map((r) => {
                const meta = CATEGORY_META[r.category];
                const Icon = meta.icon;
                const isClient = audienceMode === "client";
                return (
                  <button
                    key={r.id}
                    className="print-item"
                    style={{
                      ...S.listItem,
                      ...(selectedId === r.id ? S.listItemActive : {}),
                      ...(isClient ? S.listItemClient : {}),
                    }}
                    onClick={() => { setSelectedId(r.id); setEditing(null); }}
                    aria-current={selectedId === r.id ? "true" : undefined}
                  >
                    <div style={{ ...S.listIconWrap, ...(isClient ? { width: 40, height: 40 } : {}), background: meta.color + "1a", color: meta.color }}>
                      <Icon size={isClient ? 19 : 16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...S.listItemName, ...(isClient ? { fontSize: 16 } : {}) }}>{r.name}</div>
                      <div style={S.listItemSub}>
                        {isClient
                          ? [r.barriers?.includes("Free") ? "Free" : null, r.barriers?.includes("Confidential location") ? null : r.address || null].filter(Boolean).join(" · ") || meta.label
                          : (r.subcategory || meta.label)}
                      </div>
                      {!isClient && (
                        <div className="print-only" style={S.printDetails}>
                          {printFields.phone && r.phone && <div>{r.phone}</div>}
                          {printFields.address && r.address && <div>{r.address}</div>}
                          {printFields.website && r.website && <div>{r.website}</div>}
                          {printFields.insurance && r.insurance && <div>{r.insurance}</div>}
                          {printFields.populations && r.populations && <div>Serves: {r.populations}</div>}
                          {printFields.issues && r.issues?.length > 0 && <div>Addresses: {r.issues.join(", ")}</div>}
                          {printFields.barriers && r.barriers?.length > 0 && <div>Barriers removed: {r.barriers.join(", ")}</div>}
                          {printFields.notes && r.notes && <div>{r.notes}</div>}
                        </div>
                      )}
                    </div>
                    {isClient && r.phone && (
                      <a
                        href={`tel:${r.phone.replace(/[^0-9+]/g, "")}`}
                        style={S.listCallBtn}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Call ${r.name}`}
                      >
                        <Phone size={16} />
                      </a>
                    )}
                    <ChevronRight size={16} color="#c2c6cc" />
                  </button>
                );
              })}
            </>
          )}
        </div>

        <div className="detailPane" style={S.detailPane}>
          {(selected || editing) && (
            <button
              className="mobile-back no-print"
              style={S.mobileBackBtn}
              onClick={() => { setSelectedId(null); setEditing(null); }}
              aria-label="Back to list"
            >
              <ChevronLeft size={16} /> {audienceMode === "client" && lang === "es" ? "Volver a la lista" : audienceMode === "client" ? "Back to list" : "Back"}
            </button>
          )}
          {editing ? (
            <EditForm
              draft={editing} setDraft={setEditing} resources={resources}
              onSave={saveDraft} onCancel={() => setEditing(null)}
              connectPicker={connectPicker} setConnectPicker={setConnectPicker}
              toggleConnection={toggleConnection} toggleDraftTag={toggleDraftTag}
              editorName={editorName} setEditorName={setEditorName}
            />
          ) : selected ? (
            <DetailView
              resource={selected} resources={resources}
              onEdit={() => setEditing({ ...selected })}
              onDelete={() => deleteResource(selected.id)}
              onClose={() => closeResource(selected.id)}
              onJump={(id) => setSelectedId(id)}
              audienceMode={audienceMode}
              showToast={showToast}
              canEdit={isEditor}
              onPrint={printResource}
            />
          ) : (
            <div style={S.placeholder}>
              <Link2 size={28} color="#c2c6cc" />
              <div style={{ marginTop: 10, color: "#8a9099", fontSize: 14, textAlign: "center", maxWidth: 260 }}>
                {audienceMode === "client"
                  ? (lang === "es" ? "Toca algo de la lista para ver el teléfono, la dirección y los horarios." : "Tap something in the list to see phone, address, and hours.")
                  : "Pick a resource, or filter by issue and barrier to narrow things down."}
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && <div style={S.toast}>{toast}</div>}
      {showInsights && <InsightsPanel onClose={() => setShowInsights(false)} resources={resources} />}
      {showPrintOptions && (
        <div className="no-print" style={S.modalOverlay} onClick={() => setShowPrintOptions(false)}>
          <div style={S.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={S.formHeader}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Print options</h2>
              <button style={S.iconBtn} onClick={() => setShowPrintOptions(false)} aria-label="Close print options"><X size={16} /></button>
            </div>
            <div style={{ fontSize: 12.5, color: "#6b7178", marginBottom: 14, fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
              Choose which details to include under each resource's name in the printed list.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {PRINT_FIELD_OPTIONS.map(({ key, label }) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontFamily: "'Helvetica Neue', Arial, sans-serif", color: "#2f3437" }}>
                  <input
                    type="checkbox"
                    checked={!!printFields[key]}
                    onChange={(e) => setPrintFields({ ...printFields, [key]: e.target.checked })}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                style={{ ...S.saveBtn, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                onClick={() => { window.print(); setShowPrintOptions(false); }}
              >
                <Printer size={14} /> Print
              </button>
              <button style={S.cancelBtn} onClick={() => setShowPrintOptions(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
