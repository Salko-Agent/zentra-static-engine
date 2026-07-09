import { db, collection, addDoc, getDocs, query, orderBy, serverTimestamp, where, limit } from './firebase-config.js';
import { Auth } from './auth.js';
import { Validator } from './validator.js';

export const Community = {
    async getFeed(tag = null) {
        // Sample Data for Prototype
        const samplePosts = [
            { id: 'p1', authorName: 'Mech_Engineer', authorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=100&q=80', title: 'T-80U Tank Scale Logic Integration', content: 'Finally managed to fit the Arduino Nano inside the turret ring. The servo motors for elevation are working perfectly. #mechanic #arduino', image: 'https://images.unsplash.com/photo-1605218457224-b333a5796a30?auto=format&fit=crop&w=800&q=80', tags: ['mechanic', 'arduino'] },
            { id: 'p2', authorName: 'FrostByte', title: 'Custom Loop V2 - Leak Testing', content: 'Running the loop for 24 hours. So far pressures are stable. Used rigid tubing this time for a cleaner look. #watercooling #pcbuild', image: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?auto=format&fit=crop&w=800&q=80', tags: ['watercooling', 'pcbuild'] },
            { id: 'p3', authorName: 'SkyNet_Jr', title: 'Drone AI Unit - Navigation Test', content: 'The optical flow sensor is giving some noisy data. Need to adjust the Kalman filter parameters. #coding #drone', tags: ['coding', 'drone'] },
            { id: 'p4', authorName: 'Gundam_Pilot', title: 'PG Unleashed - Frame Assembly', content: 'The detail on this inner frame is insane. Painting the pistons in chrome silver. #gundam #modelkit', image: 'https://images.unsplash.com/photo-1616719816556-9b0d24db67f6?auto=format&fit=crop&w=800&q=80', tags: ['gundam', 'modelkit'] }
        ];

        try {
            let q;
            if (tag) {
                q = query(collection(db, 'posts'), where('tags', 'array-contains', tag), orderBy('createdAt', 'desc'));
            } else {
                q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
            }

            const snapshot = await getDocs(q);
            const realPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Merge
            let allPosts = [...realPosts, ...samplePosts];

            // Client-side filter for samples
            if (tag) {
                allPosts = allPosts.filter(p => p.tags && p.tags.includes(tag.replace('#', '')));
            }

            return allPosts;

        } catch (e) {
            console.warn("Firestore access limited, showing sample feed.");
            if (tag) {
                return samplePosts.filter(p => p.tags && p.tags.includes(tag.replace('#', '')));
            }
            return samplePosts;
        }
    },

    async getPostsByProduct(slug) {
        if (!slug) return [];
        const q = query(
            collection(db, 'posts'),
            where('linkedProductSlugs', 'array-contains', slug),
            orderBy('createdAt', 'desc'),
            limit(4)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async createPost(postData) {
        if (!Auth.requireAuth()) return;

        // Validation based on Data Model
        const validation = Validator.validatePost(postData);
        if (!validation.valid) throw new Error(validation.errors.join("\\n"));

        const docRef = await addDoc(collection(db, 'posts'), {
            ...postData,
            authorId: Auth.currentUser.uid,
            authorName: Auth.currentUser.displayName || 'Anonymous',
            authorAvatar: Auth.currentUser.photoURL,
            // Initialize stats
            stats: {
                likes: 0,
                comments: 0,
                views: 0
            },
            type: postData.type || 'build',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        return docRef.id;
    }
};
