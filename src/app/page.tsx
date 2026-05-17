import { getAllDocs } from '@/lib/docs';
import DashboardClient from '@/components/DashboardClient';

export default function Home() {
  const docs = getAllDocs();
  return <DashboardClient docs={docs} />;
}
