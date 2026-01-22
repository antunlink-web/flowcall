/**
 * Native Dialer Bridge
 * 
 * This module provides native Android capabilities for:
 * - Making phone calls directly (without user interaction)
 * - Sending SMS messages directly (without user interaction)
 * 
 * When running as a native app with proper permissions, these functions
 * will call/SMS automatically. When running in a browser, they fall back
 * to opening the phone dialer or SMS app.
 * 
 * Required Android permissions:
 * - android.permission.CALL_PHONE (for direct calling)
 * - android.permission.SEND_SMS (for direct SMS)
 */

// Check if we're running in a Capacitor native context
export const isNativeApp = (): boolean => {
  return typeof (window as any).Capacitor !== 'undefined' && 
         (window as any).Capacitor.isNativePlatform();
};

// Check if we're on Android
export const isAndroid = (): boolean => {
  return isNativeApp() && (window as any).Capacitor.getPlatform() === 'android';
};

// Interface for the native dialer plugin
interface NativeDialerPlugin {
  call(options: { number: string }): Promise<{ success: boolean }>;
  checkCallPermission(): Promise<{ granted: boolean }>;
  requestCallPermission(): Promise<{ granted: boolean }>;
}

// Interface for the native SMS plugin
interface NativeSmsPlugin {
  send(options: { number: string; message: string }): Promise<{ success: boolean }>;
  checkSmsPermission(): Promise<{ granted: boolean }>;
  requestSmsPermission(): Promise<{ granted: boolean }>;
}

// Get the native dialer plugin if available
const getNativeDialer = (): NativeDialerPlugin | null => {
  if (!isNativeApp()) return null;
  
  try {
    const Capacitor = (window as any).Capacitor;
    const plugins = Capacitor.Plugins;
    return plugins?.NativeDialer || null;
  } catch {
    return null;
  }
};

// Get the native SMS plugin if available
const getNativeSms = (): NativeSmsPlugin | null => {
  if (!isNativeApp()) return null;
  
  try {
    const Capacitor = (window as any).Capacitor;
    const plugins = Capacitor.Plugins;
    return plugins?.NativeSms || null;
  } catch {
    return null;
  }
};

/**
 * Check if native calling is available
 */
export const hasNativeCallSupport = async (): Promise<boolean> => {
  const plugin = getNativeDialer();
  if (!plugin) return false;
  
  try {
    const result = await plugin.checkCallPermission();
    return result.granted;
  } catch {
    return false;
  }
};

/**
 * Check if native SMS is available
 */
export const hasNativeSmsSupport = async (): Promise<boolean> => {
  const plugin = getNativeSms();
  if (!plugin) return false;
  
  try {
    const result = await plugin.checkSmsPermission();
    return result.granted;
  } catch {
    return false;
  }
};

/**
 * Request call permission
 */
export const requestCallPermission = async (): Promise<boolean> => {
  const plugin = getNativeDialer();
  if (!plugin) return false;
  
  try {
    const result = await plugin.requestCallPermission();
    return result.granted;
  } catch {
    return false;
  }
};

/**
 * Request SMS permission
 */
export const requestSmsPermission = async (): Promise<boolean> => {
  const plugin = getNativeSms();
  if (!plugin) return false;
  
  try {
    const result = await plugin.requestSmsPermission();
    return result.granted;
  } catch {
    return false;
  }
};

/**
 * Make a phone call
 * 
 * If native app with CALL_PHONE permission: calls directly
 * Otherwise: opens the phone dialer app
 * 
 * @returns true if call was initiated successfully
 */
export const makeCall = async (phoneNumber: string): Promise<{ success: boolean; native: boolean }> => {
  const plugin = getNativeDialer();
  
  if (plugin) {
    try {
      const hasPermission = await hasNativeCallSupport();
      
      if (hasPermission) {
        const result = await plugin.call({ number: phoneNumber });
        return { success: result.success, native: true };
      }
    } catch (error) {
      console.error('Native call failed:', error);
    }
  }
  
  // Fallback to tel: link
  try {
    window.location.href = `tel:${phoneNumber}`;
    return { success: true, native: false };
  } catch {
    return { success: false, native: false };
  }
};

/**
 * Send an SMS message
 * 
 * If native app with SEND_SMS permission: sends directly
 * Otherwise: opens the SMS app with pre-filled message
 * 
 * @returns true if SMS was sent/opened successfully
 */
export const sendSms = async (
  phoneNumber: string, 
  message: string
): Promise<{ success: boolean; native: boolean }> => {
  const plugin = getNativeSms();
  
  if (plugin) {
    try {
      const hasPermission = await hasNativeSmsSupport();
      
      if (hasPermission) {
        const result = await plugin.send({ number: phoneNumber, message });
        return { success: result.success, native: true };
      }
    } catch (error) {
      console.error('Native SMS failed:', error);
    }
  }
  
  // Fallback to sms: link
  try {
    window.location.href = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
    return { success: true, native: false };
  } catch {
    return { success: false, native: false };
  }
};

/**
 * Check and request all permissions needed for auto-dial/SMS
 */
export const requestAllPermissions = async (): Promise<{
  call: boolean;
  sms: boolean;
}> => {
  const callPermission = await requestCallPermission();
  const smsPermission = await requestSmsPermission();
  
  return {
    call: callPermission,
    sms: smsPermission,
  };
};

/**
 * Get the current permission status
 */
export const getPermissionStatus = async (): Promise<{
  isNative: boolean;
  call: boolean;
  sms: boolean;
}> => {
  if (!isNativeApp()) {
    return {
      isNative: false,
      call: false,
      sms: false,
    };
  }
  
  const callPermission = await hasNativeCallSupport();
  const smsPermission = await hasNativeSmsSupport();
  
  return {
    isNative: true,
    call: callPermission,
    sms: smsPermission,
  };
};
