import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../utils/AuthContext';
import { db } from '../../utils/firebase';
import { getAdventureProgressStatus, readProgressIds } from '../../utils/adventureProgress';
import { cacheAdventureList, getCachedAdventureList, type AdventureCacheItem } from '../../utils/questCache';

interface Adventure {
  id: string;
  title: string;
  description?: string;
  isPublic?: boolean;
  createdAt?: any;
  stages?: any[];
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const [adventures, setAdventures] = useState<Adventure[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inProgress, setInProgress] = useState<Set<string>>(new Set());
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [showingCachedData, setShowingCachedData] = useState(false);
  const router = useRouter();

  const fetchAdventures = async () => {
    if (!user) return;
    try {
      const [mySnap, publicSnap] = await Promise.all([
        getDocs(query(collection(db, 'quests'), where('creatorId', '==', user.uid))),
        getDocs(query(collection(db, 'quests'), where('isPublic', '==', true))),
      ]);
      const seen = new Set<string>();
      const data: Adventure[] = [];
      [...mySnap.docs, ...publicSnap.docs].forEach(doc => {
        if (!seen.has(doc.id)) {
          seen.add(doc.id);
          data.push({ id: doc.id, ...doc.data() } as Adventure);
        }
      });
      data.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setAdventures(data);
      setShowingCachedData(false);
      await cacheAdventureList(data as AdventureCacheItem[]);
    } catch (err) {
      const cached = await getCachedAdventureList();
      if (cached.length > 0) {
        setAdventures(cached as Adventure[]);
        setShowingCachedData(true);
      } else {
        console.error('Fetch adventures error:', err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadProgress = async () => {
    const keys = await AsyncStorage.getAllKeys();
    const progress = readProgressIds(keys);
    setInProgress(progress.inProgress);
    setCompleted(progress.completed);
  };

  useEffect(() => { fetchAdventures(); }, [user]);

  // Reload progress every time screen is focused
  useFocusEffect(useCallback(() => { loadProgress(); }, []));

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdventures();
    loadProgress();
  };

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() ?? '?';

  const renderAdventure = ({ item }: { item: Adventure }) => {
    const stageCount = item.stages?.length ?? 0;
    const status = getAdventureProgressStatus(item.id, inProgress, completed);
    const isCompleted = status === 'completed';
    const hasProgress = status === 'in-progress';

    return (
      <TouchableOpacity
        style={[styles.card, isCompleted && styles.cardCompleted]}
        onPress={() => router.push(`/quest/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconBg, isCompleted && styles.iconBgCompleted]}>
            <Text style={styles.icon}>{isCompleted ? '✅' : '🗺️'}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            {item.description ? (
              <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
            ) : null}
          </View>
          {item.isPublic && !isCompleted && (
            <View style={styles.publicBadge}>
              <Text style={styles.publicText}>Јавно</Text>
            </View>
          )}
          {isCompleted && (
            <View style={styles.completedBadge}>
              <Text style={styles.completedText}>Завршено</Text>
            </View>
          )}
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.cardMeta}>{stageCount} етапи</Text>
          <View style={[
            styles.actionBtn,
            hasProgress && styles.actionBtnResume,
            isCompleted && styles.actionBtnCompleted,
          ]}>
            <Text style={styles.actionBtnText}>
              {isCompleted ? 'Отвори повторно' : hasProgress ? '▶ Продолжи' : 'Играј →'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Добредојдовте 👋</Text>
          <Text style={styles.name} numberOfLines={1}>{user?.displayName || user?.email}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.settingsButton}
            accessibilityRole="button"
            accessibilityLabel="Отвори поставки"
            onPress={() => router.push('/settings')}
          >
            <MaterialIcons name="settings" size={20} color="#374151" />
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={adventures}
          keyExtractor={item => item.id}
          renderItem={renderAdventure}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />
          }
          ListHeaderComponent={
            adventures.length > 0 ? (
              <View style={styles.listHeader}>
                <Text style={styles.sectionLabel}>МОИ АВАНТУРИ ({adventures.length})</Text>
                {showingCachedData && (
                  <View style={styles.cachedBadge}>
                    <Text style={styles.cachedBadgeText}>Офлајн приказ</Text>
                  </View>
                )}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🗺️</Text>
              <Text style={styles.emptyTitle}>Немаш авантури уште</Text>
              <Text style={styles.emptyDesc}>
                Создај авантура на веб апликацијата{'\n'}и ќе се прикаже овде.
              </Text>
              <View style={styles.emptyLink}>
                <Text style={styles.emptyLinkText}>avantura.mismath.net</Text>
              </View>
            </View>
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
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: { flex: 1, marginRight: 12 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greeting: { fontSize: 12, color: '#9ca3af', marginBottom: 2 },
  name: { fontSize: 17, fontWeight: '700', color: '#111827' },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#4f46e5',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 40 },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#9ca3af',
    letterSpacing: 1,
  },
  cachedBadge: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cachedBadgeText: {
    color: '#c2410c',
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    marginBottom: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardCompleted: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconBg: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#eef2ff',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  iconBgCompleted: { backgroundColor: '#dcfce7' },
  icon: { fontSize: 20 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardDesc: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  publicBadge: {
    backgroundColor: '#f0fdf4', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 10,
  },
  publicText: { color: '#16a34a', fontSize: 11, fontWeight: '600' },
  completedBadge: {
    backgroundColor: '#dcfce7', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 10,
  },
  completedText: { color: '#15803d', fontSize: 11, fontWeight: '700' },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: '#f9fafb', paddingTop: 10,
  },
  cardMeta: { fontSize: 13, color: '#6b7280' },
  actionBtn: {
    backgroundColor: '#4f46e5', paddingHorizontal: 14,
    paddingVertical: 6, borderRadius: 10,
  },
  actionBtnResume: { backgroundColor: '#f59e0b' },
  actionBtnCompleted: { backgroundColor: '#6b7280' },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptyDesc: {
    fontSize: 14, color: '#9ca3af', textAlign: 'center',
    lineHeight: 22, marginBottom: 20,
  },
  emptyLink: {
    backgroundColor: '#eef2ff', paddingHorizontal: 16,
    paddingVertical: 8, borderRadius: 12,
  },
  emptyLinkText: { color: '#4f46e5', fontWeight: '600', fontSize: 14 },
});
