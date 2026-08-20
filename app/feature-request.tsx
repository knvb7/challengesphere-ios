import FeatureRequest from '@/screens/FeatureRequest';
import { useRouter } from 'expo-router';

export default function FeatureRequestPage() {
  const router = useRouter();
  return <FeatureRequest onBack={() => router.back()} />;
}
