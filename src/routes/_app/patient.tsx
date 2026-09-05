import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Chip } from "@/components/medlens/badges";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/patient")({
  head: () => ({
    meta: [
      { title: "Patient profile — MedLens" },
      {
        name: "description",
        content: "Create and manage the user-entered patient profile used across MedLens records.",
      },
      { property: "og:title", content: "Patient profile — MedLens" },
      { property: "og:description", content: "User-entered patient details, never inferred." },
    ],
  }),
  component: PatientPage,
});

function PatientPage() {
  const qc = useQueryClient();
  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({
    full_name: "",
    date_of_birth: "",
    gender: "",
    phone: "",
    email: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (patient) {
      setForm({
        full_name: patient.full_name ?? "",
        date_of_birth: patient.date_of_birth ?? "",
        gender: patient.gender ?? "",
        phone: patient.phone ?? "",
        email: patient.email ?? "",
      });
    }
  }, [patient]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) {
      setBusy(false);
      return;
    }
    const payload = {
      user_id: userId,
      full_name: form.full_name,
      date_of_birth: form.date_of_birth || null,
      gender: form.gender || null,
      phone: form.phone || null,
      email: form.email || null,
      updated_at: new Date().toISOString(),
    };
    const res = patient
      ? await supabase.from("patients").update(payload).eq("id", patient.id)
      : await supabase.from("patients").insert(payload);
    setBusy(false);
    if (res.error) {
      toast.error("Could not save the profile. Please try again.");
      return;
    }
    await supabase.from("audit_logs").insert({
      user_id: userId,
      entity_type: "patient",
      entity_id: patient?.id ?? null,
      action: patient ? "PATIENT_UPDATED" : "PATIENT_CREATED",
      detail: `Patient profile ${patient ? "updated" : "created"} by the user.`,
    });
    toast.success("Patient profile saved.");
    qc.invalidateQueries();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Patient profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          These details are entered by you. MedLens never infers or fills in missing patient
          information.
        </p>
      </div>

      <form onSubmit={save} className="surface max-w-2xl space-y-5 p-6">
        <Chip tone="user">User-entered</Chip>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dob">Date of birth</Label>
            <Input
              id="dob"
              type="date"
              value={form.date_of_birth}
              onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gender">Gender</Label>
            <Input
              id="gender"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pemail">Contact email</Label>
            <Input
              id="pemail"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
        </div>
        <Button type="submit" disabled={busy || isLoading}>
          {busy ? "Saving…" : patient ? "Update profile" : "Create profile"}
        </Button>
      </form>
    </div>
  );
}
