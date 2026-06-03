// ============================================
// AUTH.JS - FIXED VERSION
// ============================================

// ============================================
// KONSTANTA
// ============================================
const STORAGE_KEYS = {
  USER_ID: 'offline_user_id',
  USER_EMAIL: 'offline_user_email',
  USER_NAME: 'offline_user_name',
  USER_ROLE: 'offline_user_role',
  OFFLINE_ALLOWED: 'offline_allowed'
};

// ============================
// Device helpers
// ============================
function isMobileDevice() {
  try {
    if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean') {
      return navigator.userAgentData.mobile;
    }
    return /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
  } catch (e) {
    return false;
  }
}

function getDeviceType() {
  try {
    const ua = navigator.userAgent;
    
    // Check mobile first
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
      return 'smartphone';
    }
    
    // Check tablet
    if (/iPad|Android|Tablet/i.test(ua)) {
      return 'tablet';
    }
    
    // Check if laptop
    if (/Windows NT|Macintosh|Linux/i.test(ua)) {
      // Windows/Mac/Linux
      if (/Mobile|Mobi/i.test(ua)) {
        return 'smartphone'; // Mobile Windows
      }
      // Check for laptop indicators
      if (/Win32|MacPPC|MacIntel/i.test(ua)) {
        return 'laptop';
      }
      return 'desktop';
    }
    
    return 'desktop';
  } catch (e) {
    return 'unknown';
  }
}

function getDeviceModel() {
  try {
    const ua = navigator.userAgent;
    
    // Try to extract device model from UserAgent
    
    // Samsung devices
    const samsungMatch = ua.match(/SM-([A-Z0-9]+)/);
    if (samsungMatch) return `Samsung SM-${samsungMatch[1]}`;
    
    // Xiaomi (Redmi, Poco)
    const xiaomiMatch = ua.match(/(Redmi|Poco|MI|POCO)\s+([A-Za-z0-9\s]+)/i);
    if (xiaomiMatch) return `${xiaomiMatch[1]} ${xiaomiMatch[2]}`.trim();
    
    // iPhone
    const iphoneMatch = ua.match(/iPhone\s*([A-Za-z0-9\s]*)/);
    if (iphoneMatch) return `iPhone ${iphoneMatch[1]}`.trim();
    
    // iPad
    const ipadMatch = ua.match(/iPad\s*([A-Za-z0-9\s]*)/);
    if (ipadMatch) return `iPad ${ipadMatch[1]}`.trim();
    
    // Oppo
    const oppoMatch = ua.match(/(OPPO|CPH)[A-Z0-9]+/);
    if (oppoMatch) return `Oppo ${oppoMatch[1]}`;
    
    // Vivo
    const vivoMatch = ua.match(/(Vivo|V[0-9]+|Y[0-9]+)/);
    if (vivoMatch) return `Vivo ${vivoMatch[1]}`;
    
    // Realme
    const realmeMatch = ua.match(/(Realme|RMX)[A-Z0-9]+/);
    if (realmeMatch) return `Realme ${realmeMatch[1]}`;
    
    // HONOR
    const honorMatch = ua.match(/(HONOR|HRY)[A-Z0-9]+/);
    if (honorMatch) return `Honor ${honorMatch[1]}`;
    
    // OnePlus
    const oneplusMatch = ua.match(/(OnePlus|ONE|ONEPLUS)[A-Z0-9]*/i);
    if (oneplusMatch) return `OnePlus ${oneplusMatch[1]}`;
    
    // Google Pixel
    if (ua.includes('Pixel')) {
      const pixelMatch = ua.match(/Pixel\s*([0-9]+)/);
      return `Google Pixel ${pixelMatch ? pixelMatch[1] : 'Phone'}`;
    }
    
    // Windows/Mac info
    if (navigator.userAgentData && navigator.userAgentData.platform) {
      const platform = navigator.userAgentData.platform;
      const brand = navigator.userAgentData.brand || '';
      return `${platform} ${brand}`.trim();
    }
    
    // Fallback: extract OS info
    if (/Windows NT 10/.test(ua)) return 'Windows 10/11';
    if (/Windows NT/.test(ua)) return 'Windows';
    if (/Macintosh/.test(ua)) {
      const macMatch = ua.match(/Mac OS X ([\d_]+)/);
      return macMatch ? `macOS ${macMatch[1].replace(/_/g, '.')}` : 'macOS';
    }
    if (/Linux/.test(ua)) return 'Linux';
    
    return ua || 'unknown';
  } catch (e) {
    return 'unknown';
  }
}

async function registerDeviceIfNew(deviceId, opts = {}) {
  // opts: { device_name, device_type, device_model }
  try {
    if (!deviceId) return null;
    const { data: existing, error: selErr } = await sb.from('offline_devices')
      .select('id,device_id,device_name,device_type,device_model,allowed,created_at,updated_at')
      .eq('device_id', deviceId)
      .maybeSingle();
    if (selErr) {
      console.warn('Device lookup failed:', selErr);
      return null;
    }

    const basePayload = {
      device_id: deviceId,
      device_name: opts.device_name || deviceId,
      allowed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const fullPayload = {
      ...basePayload,
      device_type: opts.device_type || getDeviceType(),
      device_model: opts.device_model || getDeviceModel()
    };

    const tryInsert = async (payload) => {
      const { data: inserted, error: insErr } = await sb
        .from('offline_devices')
        .insert(payload)
        .select('id,device_id,device_name,allowed,created_at,updated_at')
        .single();
      return { inserted, error: insErr };
    };

    if (!existing) {
      let { inserted, error: insErr } = await tryInsert(fullPayload);
      if (insErr) {
        const missingFieldMatch = insErr.message?.match(/Could not find the '(.+?)' column/);
        if (missingFieldMatch) {
          const missingColumn = missingFieldMatch[1];
          const fallbackPayload = { ...fullPayload };
          delete fallbackPayload[missingColumn];
          const retry = await tryInsert(fallbackPayload);
          if (retry.error) {
            console.warn('Insert offline_device failed after fallback:', retry.error);
            return null;
          }
          inserted = retry.inserted;
        } else {
          console.warn('Insert offline_device failed:', insErr);
          return null;
        }
      }
      return inserted;
    } else {
      const updates = {};
      if ((opts.device_name || deviceId) !== existing.device_name) updates.device_name = opts.device_name || deviceId;
      if ((opts.device_model || getDeviceModel()) !== existing.device_model) updates.device_model = opts.device_model || getDeviceModel();
      if ((opts.device_type || getDeviceType()) !== existing.device_type) updates.device_type = opts.device_type || getDeviceType();
      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        let { error: updErr } = await sb.from('offline_devices').update(updates).eq('device_id', deviceId);
        if (updErr) {
          const missingFieldMatch = updErr.message?.match(/Could not find the '(.+?)' column/);
          if (missingFieldMatch) {
            const missingColumn = missingFieldMatch[1];
            delete updates[missingColumn];
            if (Object.keys(updates).length > 1) {
              updates.updated_at = new Date().toISOString();
              const { error: retryErr } = await sb.from('offline_devices').update(updates).eq('device_id', deviceId);
              if (retryErr) console.warn('Update offline_device failed after fallback:', retryErr);
            }
          } else {
            console.warn('Update offline_device failed:', updErr);
          }
        }
      }
      return existing;
    }
  } catch (error) {
    console.error('registerDeviceIfNew error:', error);
    return null;
  }
}

// ============================================
// FUNGSI LOGIN
// ============================================
async function login(email, password) {
  try {
    console.log('🔐 Login attempt:', email);
    
    // 1. Login ke Supabase Auth
    const { data: authData, error: authError } = await sb.auth.signInWithPassword({
      email: email,
      password: password
    });
    
    if (authError) {
      console.error('Auth error:', authError);
      return { 
        success: false, 
        error: authError.message === 'Invalid login credentials' 
          ? 'Email atau password salah!' 
          : authError.message 
      };
    }
    
    const userId = authData.user.id;
    const userEmail = authData.user.email;
    console.log('✅ Auth success, user:', userId);
    
    // 2. Ambil profile dari tabel profiles
    let profile = null;
    
    try {
      const { data, error } = await sb
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
        
      profile = data;
      
      if (error) {
        console.warn('Profile fetch warning:', error);
      }
      
      // Jika profile tidak ada, buat otomatis
      if (!profile) {
        console.log('⚠️ Profile not found, creating...');
        const newProfile = {
          id: userId,
          nama: userEmail.split('@')[0],
          role: 'kasir',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          arrived_at: new Date().toISOString()
        };
        
        const { data: inserted, error: insertError } = await sb
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();
        
        if (!insertError && inserted) {
          profile = inserted;
          console.log('✅ Profile created:', profile);
        } else {
          console.error('Failed to create profile:', insertError);
          profile = newProfile;
        }
      }
    } catch (err) {
      console.error('Profile error:', err);
    }
    
    // 3. Ambil role dan nama dengan priority
    const role = profile?.role || 'kasir';
    const nama = profile?.nama || userEmail.split('@')[0];
    
    console.log('📋 User role from server:', role, 'nama:', nama);
    
    // 4. Simpan ke localStorage
    localStorage.setItem(STORAGE_KEYS.USER_ID, userId);
    localStorage.setItem(STORAGE_KEYS.USER_EMAIL, userEmail);
    localStorage.setItem(STORAGE_KEYS.USER_NAME, nama);
    localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
    
    // 5. Set global variable untuk akses cepat
    window.currentUserId = userId;
    window.currentUserRole = role;
    window.currentUserName = nama;
    
    // 6. Cek offline access (fire-and-forget, jangan blokir login)
    const deviceId = getDeviceId();
    if (isMobileDevice()) {
      localStorage.removeItem(STORAGE_KEYS.OFFLINE_ALLOWED);
    } else {
      // Jalankan device registration + offline check di background
      _registerAndCheckOffline(deviceId).catch(function(err) {
        console.warn('Device registration error:', err);
      });
    }
    
    return {
      success: true,
      user: {
        id: userId,
        email: userEmail,
        nama: nama,
        role: role
      }
    };
    
  } catch (error) {
    console.error('Login error:', error);
    return { 
      success: false, 
      error: 'Terjadi kesalahan. Silakan coba lagi.' 
    };
  }
}

// Helper: register device + check offline access (non-blocking)
async function _registerAndCheckOffline(deviceId) {
  await registerDeviceIfNew(deviceId, { device_name: window.navigator?.platform || deviceId, device_model: getDeviceModel(), device_type: getDeviceType() });
  await checkOfflineAccess();
}

// ============================================
// FUNGSI CEK SESSION (APA SUDAH LOGIN)
// ============================================
async function checkSession() {
  try {
    const { data: { user }, error } = await sb.auth.getUser();
    
    if (error || !user) {
      return { isLoggedIn: false };
    }
    
    // Gunakan data dari localStorage jika sudah ada (cepat)
    let role = localStorage.getItem(STORAGE_KEYS.USER_ROLE);
    let nama = localStorage.getItem(STORAGE_KEYS.USER_NAME);
    
    // Hanya fetch profile dari server jika belum ada di localStorage
    if (!role) {
      const { data: profile } = await sb
        .from('profiles')
        .select('role, nama')
        .eq('id', user.id)
        .maybeSingle();
      
      role = profile?.role || 'kasir';
      nama = profile?.nama || user.email?.split('@')[0] || 'User';
    }
    
    localStorage.setItem(STORAGE_KEYS.USER_ID, user.id);
    localStorage.setItem(STORAGE_KEYS.USER_EMAIL, user.email);
    localStorage.setItem(STORAGE_KEYS.USER_NAME, nama || user.email?.split('@')[0] || 'User');
    localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
    
    window.currentUserId = user.id;
    window.currentUserRole = role;
    window.currentUserName = nama || 'User';

    // Device check di background (non-blocking)
    const deviceId = getDeviceId();
    if (isMobileDevice()) {
      localStorage.removeItem(STORAGE_KEYS.OFFLINE_ALLOWED);
    } else {
      _registerAndCheckOffline(deviceId).catch(function(err) {
        console.warn('Session device check error:', err);
      });
    }
    
    return {
      isLoggedIn: true,
      user: {
        id: user.id,
        email: user.email,
        nama: nama || 'User',
        role: role
      }
    };
    
  } catch (error) {
    console.error('Check session error:', error);
    return { isLoggedIn: false };
  }
}

// ============================================
// FUNGSI AMBIL ROLE USER SAAT INI (PAKSA DARI SERVER)
// ============================================
async function getCurrentUserRole() {
  // Cek dari localStorage dulu (cepat)
  let role = localStorage.getItem(STORAGE_KEYS.USER_ROLE);
  if (role) return role;
  
  // Jika tidak ada, cek session
  const session = await checkSession();
  return session.isLoggedIn ? session.user.role : null;
}

// ============================================
// FUNGSI REFRESH ROLE DARI SERVER
// ============================================
async function refreshUserRole() {
  if (!navigator.onLine) {
    return localStorage.getItem(STORAGE_KEYS.USER_ROLE) || 'kasir';
  }
  
  try {
    const userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
    if (!userId) return null;
    
    const { data: profile } = await sb
      .from('profiles')
      .select('role, nama')
      .eq('id', userId)
      .maybeSingle();
    
    const role = profile?.role || 'kasir';
    const nama = profile?.nama || 'User';
    
    localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
    localStorage.setItem(STORAGE_KEYS.USER_NAME, nama);
    
    window.currentUserRole = role;
    window.currentUserName = nama;
    
    return role;
  } catch (error) {
    return localStorage.getItem(STORAGE_KEYS.USER_ROLE) || 'kasir';
  }
}

// ============================================
// FUNGSI CEK APAKAH ADMIN
// ============================================
async function isAdmin() {
  // Pakai refresh untuk memastikan role terbaru
  const role = await refreshUserRole();
  return role === 'admin';
}

// ============================================
// FUNGSI CEK APAKAH KASIR
// ============================================
async function isKasir() {
  const role = await refreshUserRole();
  return role === 'kasir';
}

// ============================================
// FUNGSI AMBIL NAMA USER
// ============================================
function getCurrentUserName() {
  return localStorage.getItem(STORAGE_KEYS.USER_NAME) || 'User';
}

// ============================================
// FUNGSI AMBIL ID USER
// ============================================
function getCurrentUserId() {
  return localStorage.getItem(STORAGE_KEYS.USER_ID);
}

// ============================================
// FUNGSI LOGOUT
// ============================================
async function logout() {
  try {
    await sb.auth.signOut();
  } catch (e) {
    console.warn('Sign out error:', e);
  }
  
  // Hapus semua data lokal
  localStorage.removeItem(STORAGE_KEYS.USER_ID);
  localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
  localStorage.removeItem(STORAGE_KEYS.USER_NAME);
  localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
  localStorage.removeItem("offline_allowed");
  
  // Reset global variables
  window.currentUserId = null;
  window.currentUserRole = null;
  window.currentUserName = null;
  
  window.location.href = "index.html";
}

// ============================================
// OFFLINE ACCESS
// ============================================
function getDeviceId() {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}

async function checkOfflineAccess() {
  const deviceId = getDeviceId();
  const userId = getCurrentUserId();
  
  if (!userId) return false;
  if (isMobileDevice()) {
    localStorage.removeItem(STORAGE_KEYS.OFFLINE_ALLOWED);
    return false;
  }
  
  try {
    const { data, error } = await sb
      .from("offline_devices")
      .select('id,device_id,allowed')
      .eq("device_id", deviceId)
      .eq("allowed", true)
      .maybeSingle();
    
    if (data && !error) {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_ALLOWED, "true");
      return true;
    } else {
      localStorage.removeItem(STORAGE_KEYS.OFFLINE_ALLOWED);
      return false;
    }
  } catch(e) {
    console.warn('Check offline access error:', e);
    return false;
  }
}

function isDeviceAllowedForOffline() {
  // Only allow offline on desktop/laptop devices, not smartphones.
  const type = getDeviceType();
  return type !== 'smartphone';
}

function canUseOfflineMode() {
  return isDeviceAllowedForOffline() && offlineLoginAllowed();
}

function offlineLoginAllowed() {
  return localStorage.getItem(STORAGE_KEYS.OFFLINE_ALLOWED) === "true";
}

// ============================================
// UPDATE PROFIL USER
// ============================================
async function updateUserProfile(namaBaru) {
  const userId = getCurrentUserId();
  if (!userId) return { success: false, error: 'Not logged in' };
  
  try {
    const { error } = await sb
      .from('profiles')
      .update({ nama: namaBaru, updated_at: new Date().toISOString() })
      .eq('id', userId);
    
    if (error) throw error;
    
    localStorage.setItem(STORAGE_KEYS.USER_NAME, namaBaru);
    window.currentUserName = namaBaru;
    
    return { success: true };
  } catch (error) {
    console.error('Update profile error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// EXPOSE FUNGSI KE WINDOW
// ============================================
window.auth = {
  login,
  logout,
  checkSession,
  getCurrentUserRole,
  getCurrentUserName,
  getCurrentUserId,
  isAdmin,
  isKasir,
  refreshUserRole,
  updateUserProfile,
  checkOfflineAccess,
  offlineLoginAllowed,
  isDeviceAllowedForOffline,
  canUseOfflineMode
};

// Auto check session saat load (non-blocking)
document.addEventListener('DOMContentLoaded', async () => {
  // Skip jika offline — gunakan localStorage saja
  if (!navigator.onLine) {
    var role = localStorage.getItem(STORAGE_KEYS.USER_ROLE);
    var nama = localStorage.getItem(STORAGE_KEYS.USER_NAME);
    if (role) {
      window.currentUserRole = role;
      window.currentUserName = nama || 'User';
    }
    return;
  }
  const session = await checkSession();
  if (session.isLoggedIn) {
    console.log('✅ User logged in:', session.user.nama, 'as', session.user.role);
  }
});