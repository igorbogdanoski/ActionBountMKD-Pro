import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../utils/AuthContext';
import { auth } from '../utils/firebase';

export default function HomeScreen() {
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>??? ????????</Text>
      <Text style={styles.subtitle}>??????? ????: {user?.email}</Text>
      
      <TouchableOpacity style={styles.button} onPress={() => auth.signOut()}>
        <Text style={styles.buttonText}>?????? ??</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#dc2626',
    padding: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  }
});
