/**
 * modules/profile.js
 * Handles fetching user dashboard data.
 */

import { db, auth, collection, query, where, getDocs, orderBy, updateDoc, doc, serverTimestamp } from '../../firebase-config.js';

export async function getUserDashboardData() {
    if (!auth.currentUser) return null;
    const uid = auth.currentUser.uid;

    try {
        // 1. Fetch My Listings
        const listingsQ = query(collection(db, 'listings'), where('sellerId', '==', uid), orderBy('createdAt', 'desc'));
        const listingsSnap = await getDocs(listingsQ);
        const myListings = listingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // 2. Fetch My Purchases (I am Buyer)
        const purchasesQ = query(collection(db, 'transactions'), where('buyerId', '==', uid), orderBy('createdAt', 'desc'));
        const purchasesSnap = await getDocs(purchasesQ);
        const myPurchases = purchasesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // 3. Fetch My Sales (I am Seller)
        const salesQ = query(collection(db, 'transactions'), where('sellerId', '==', uid), orderBy('createdAt', 'desc'));
        const salesSnap = await getDocs(salesQ);
        const mySales = salesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // 4. Calculate Stats
        // Balance = Sum of 'completed' sales (minus fees) + 'held_in_escrow' (potential)
        // For MVP, we just show "Pending Payouts"
        const pendingPayouts = mySales
            .filter(t => t.status !== 'completed' && t.status !== 'cancelled')
            .reduce((acc, t) => acc + (t.price * 0.94), 0); // 6% fee deduction

        const completedPayouts = mySales
            .filter(t => t.status === 'completed')
            .reduce((acc, t) => acc + (t.price * 0.94), 0);

        return {
            listings: myListings,
            purchases: myPurchases,
            sales: mySales,
            stats: {
                activeListings: myListings.filter(l => l.status === 'active').length,
                pendingBalance: pendingPayouts,
                availableBalance: completedPayouts
            }
        };

    } catch (error) {
        console.error("Error fetching dashboard:", error);
        return null;
    }
}

// --- ESCROW ACTIONS ---

export async function markAsShipped(txId) {
    await updateDoc(doc(db, 'transactions', txId), {
        status: 'shipped',
        shippedAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
    });
}

export async function confirmReceipt(txId) {
    // This releases funds in a real system
    await updateDoc(doc(db, 'transactions', txId), {
        status: 'completed',
        completedAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
    });
}
