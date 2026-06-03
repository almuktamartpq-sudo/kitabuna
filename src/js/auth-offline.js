// js/auth-offline.js - OFFLINE AUTHENTICATION

// ============================================
// FIXED OFFLINE CREDENTIALS
// ============================================
const OFFLINE_USERS = [
  {
    id: "offline_admin_001",
    email: "adminku@gmail.com",
    password: "admin",
    nama: "Administrator",
    role: "admin"
  },
  {
    id: "offline_kasir_001", 
    email: "kasirku@gmail.com",
    password: "kasir",
    nama: "Kasir Utama",
    role: "kasir"
  }
];

// ============================================
// CEK APAKAH OFFLINE MODE
// ============================================
function isOfflineMode() {
  return !navigator.onLine;
}

function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.userAgentData && navigator.userAgentData.mobile === true);
}

function canUseOfflineAuth() {
  return !isMobileDevice();
}

// ============================================
// LOGIN OFFLINE (PAKAI FIXED CREDENTIALS)
// ============================================
async function offlineLogin(email, password) {
  console.log('🔐 Offline login attempt:', email);

  if (!canUseOfflineAuth()) {
    console.warn('Offline login blocked on mobile device');
    return {
      success: false,
      error: 'Offline login hanya diperbolehkan di komputer desktop/laptop yang disetujui.'
    };
  }
  
  // Cari user yang cocok
  const user = OFFLINE_USERS.find(u => u.email === email && u.password === password);
  
  if (!user) {
    console.error('Offline login failed: Invalid credentials');
    return {
      success: false,
      error: 'Email atau password salah! (Offline Mode)'
    };
  }
  
  // Simpan ke localStorage
  localStorage.setItem("offline_user_id", user.id);
  localStorage.setItem("offline_user_email", user.email);
  localStorage.setItem("offline_user_name", user.nama);
  localStorage.setItem("offline_user_role", user.role);
  localStorage.setItem("offline_mode", "true");
  
  console.log('✅ Offline login success, role:', user.role);
  
  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      nama: user.nama,
      role: user.role
    }
  };
}

// ============================================
// LOGIN HYBRID (ONLINE + OFFLINE)
// ============================================
async function hybridLogin(email, password) {
  // Jika online, coba login ke Supabase dulu
  if (navigator.onLine) {
    try {
      console.log('🌐 Online mode: trying Supabase login...');
      
      const { data, error } = await sb.auth.signInWithPassword({
        email: email,
        password: password
      });
      
      if (!error && data.user) {
        // Ambil profile dari Supabase
        const { data: profile } = await sb
          .from('profiles')
          .select('nama, role')
          .eq('id', data.user.id)
          .maybeSingle();
        
        const userRole = profile?.role || 'kasir';
        const userName = profile?.nama || data.user.email.split('@')[0];
        
        localStorage.setItem("offline_user_id", data.user.id);
        localStorage.setItem("offline_user_email", data.user.email);
        localStorage.setItem("offline_user_name", userName);
        localStorage.setItem("offline_user_role", userRole);
        localStorage.setItem("offline_mode", "false");
        
        console.log('✅ Online login success, role:', userRole);
        
        return {
          success: true,
          user: {
            id: data.user.id,
            email: data.user.email,
            nama: userName,
            role: userRole
          }
        };
      }
    } catch (err) {
      console.warn('Online login failed:', err.message);
      // Lanjut ke offline login
    }
  }
  
  // Jika offline atau online login gagal, coba offline login
  if (!canUseOfflineAuth()) {
    console.warn('Offline mode tidak diizinkan pada perangkat mobile.');
    return {
      success: false,
      error: 'Offline login hanya tersedia untuk perangkat desktop/laptop yang disetujui.'
    };
  }

  console.log('📱 Switching to offline mode...');
  return await offlineLogin(email, password);
}

// ============================================
// CEK SESSION (OFFLINE/ONLINE)
// ============================================
async function checkOfflineSession() {
  const userId = localStorage.getItem("offline_user_id");
  const userRole = localStorage.getItem("offline_user_role");
  const offlineMode = localStorage.getItem("offline_mode") === "true";
  
  if (userId && userRole) {
    console.log('✅ Session found, offline mode:', offlineMode);
    return {
      isLoggedIn: true,
      offlineMode: offlineMode,
      user: {
        id: userId,
        email: localStorage.getItem("offline_user_email"),
        nama: localStorage.getItem("offline_user_name"),
        role: userRole
      }
    };
  }
  
  return { isLoggedIn: false };
}

// ============================================
// LOGOUT (BERSIHKAN SESSION)
// ============================================
async function offlineLogout() {
  // Coba logout dari Supabase jika online
  if (navigator.onLine && window.sb) {
    try {
      await sb.auth.signOut();
    } catch(e) {}
  }
  
  // Hapus semua data lokal
  localStorage.removeItem("offline_user_id");
  localStorage.removeItem("offline_user_email");
  localStorage.removeItem("offline_user_name");
  localStorage.removeItem("offline_user_role");
  localStorage.removeItem("offline_mode");
  localStorage.removeItem("offline_allowed");
  
  window.location.href = "index.html";
}

// ============================================
// EXPOSE FUNGSI
// ============================================
window.offlineAuth = {
  login: hybridLogin,
  offlineLogin: offlineLogin,
  checkSession: checkOfflineSession,
  logout: offlineLogout,
  isOfflineMode: isOfflineMode,
  getCurrentUser: () => ({
    id: localStorage.getItem("offline_user_id"),
    email: localStorage.getItem("offline_user_email"),
    nama: localStorage.getItem("offline_user_name"),
    role: localStorage.getItem("offline_user_role")
  })
};

console.log('📱 Offline auth module loaded');