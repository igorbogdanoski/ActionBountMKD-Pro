import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, orderBy, getDocs, or } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useAuth } from '../../utils/AuthContext';
import { db } from '../../utils/firebase';

interface Quest {
  id: string;
  title: string;
  description?: string;
  stageCount?: number;
  isPublic?: boolean;
  createdAt?: any;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchQuests = async () => {
    if (!user) return;
    try {
      // Show user's own quests + public quests
      const [mySnap, publicSnap] = await Promise.all([
        getDocs(query(collection(db, 'quests'), where('creatorId', '==', user.uid))),
        getDocs(query(collection(db, 'quests'), where('isPublic', '==', true))),
      ]);
      const seen = new Set<string>();
      const data: Quest[] = [];
      [...mySnap.docs, ...publicSnap.docs].forEach(doc => {
        if (!seen.has(doc.id)) {
          seen.add(doc.id);
          data.push({ id: doc.id, ...doc.data() } as Quest);
        }
      });
      data.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setQuests(data);
    } catch (err) {
      console.error('Fetch quests error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchQuests(); }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchQuests();
  };

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() ?? '?';

  const renderQuest = ({ item }: { item: Quest }) => (
    <TouchableOpacity style={styles.questCard} onPress={() => router.push(`/quest/${item.id}`)}>
      <View style={styles.questHeader}>
        <View style={styles.questIconBg}>
          <Text style={styles.questIcon}>🗺</Text>
        </View>
        <View style={styles.questInfo}>
          <Text style={styles.questTitle} numberOfLines={1}>{item.title}</Text>
          {item.description ? (
            <Text style={styles.questDesc} numberOfLines={1}>{item.description}</Text>
          ) : null}
        </View>
        {item.isPublic && (
          <View style={styles.publicBadge}>
            <Text style={styles.publicText}>Јавно</Text>
          </View>
        )}
      </View>
      <View style={styles.questFooter}>
        <Text style={styles.questMeta}>
          {(item as any).stages?.length ?? item.stageCount ?? 0} етапи
        </Text>
        <Text style={styles.questArrow}>→</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Добредојдовте 👋</Text>
          <Text style={styles.name}>{user?.displayName || user?.email}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={quests}
          keyExtractor={item => item.id}
          renderItem={renderQuest}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🗺️</Text>
              <Text style={styles.emptyTitle}>Немаш квестови уште</Text>
              <Text style={styles.emptyDesc}>
                Создај квест на веб апликацијата{'\n'}и ќе се прикаже овде.
              </Text>
              <View style={styles.emptyLink}>
                <Text style={styles.emptyLinkText}>avantura.mismath.net</Text>
              </View>
            </View>
          }
          ListHeaderComponent={
            quests.length > 0 ? (
              <Text style={styles.sectionLabel}>МОИ АВАНТУРИ ({quests.length})</Text>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  greeting: { fontSize: 13, color: '#9ca3af', marginBottom: 2 },
  name: { fontSize: 18, fontWeight: '700', color: '#111827', maxWidth: 240 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 1,
    marginBottom: 12,
  },
  questCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  questHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  questIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  questIcon: { fontSize: 20 },
  questInfo: { flex: 1 },
  questTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  questDesc: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  publicBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  publicText: { color: '#16a34a', fontSize: 11, fontWeight: '600' },
  questFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f9fafb',
    paddingTop: 10,
  },
  questMeta: { fontSize: 13, color: '#6b7280' },
  questArrow: { fontSize: 16, color: '#4f46e5', fontWeight: 'bold' },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptyDesc: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  emptyLink: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  emptyLinkText: { color: '#4f46e5', fontWeight: '600', fontSize: 14 },
});
