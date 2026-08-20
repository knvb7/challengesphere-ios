import About from '@/screens/About';
import { useRouter } from 'expo-router';

export default function AboutPage() {
  const router = useRouter();
  return <About onBack={() => router.back()} />;
}
