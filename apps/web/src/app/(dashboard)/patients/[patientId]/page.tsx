import PatientProfilePage from "@/components/patients/PatientProfilePage";

type PatientPageProps = {
  params: Promise<{
    patientId: string;
  }>;
};

export default async function PatientPage({ params }: PatientPageProps) {
  const { patientId } = await params;

  return <PatientProfilePage patientId={patientId} />;
}
