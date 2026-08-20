import EditProfile from '@/screens/EditProfile';
import { useRouter } from 'expo-router';

export default function EditProfilePage() {
  const router = useRouter();
  return <EditProfile onBack={() => router.back()} />;
}