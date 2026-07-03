import { ref } from 'vue';
import { SignJWT } from 'jose';

/**
 * 认证 composable：管理 Supabase 自定义 JWT 令牌
 *
 * 首版使用预共享 UUID 令牌实现零注册的设备识别。
 * UUID 通过 HS256 签名为 JWT（sub = UUID），注入 Supabase 客户端，
 * 使 Postgres 的 auth.uid() 返回该 UUID，配合 RLS 实现用户数据隔离。
 */
export function useAuth() {
  const token = ref<string>('');
  const isConfigured = ref(false);

  const STORAGE_KEY = 'prism_sync_token';
  const JWT_KEY = 'prism_sync_jwt';

  /** 从 localStorage 加载已有令牌 */
  function loadToken() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      token.value = stored;
      isConfigured.value = true;
    }
  }

  /** 用 HS256 将 UUID 签名为 Supabase 兼容的 JWT */
  async function signToken(uuid: string): Promise<string> {
    const secret = import.meta.env.VITE_SUPABASE_JWT_SECRET;
    if (!secret) {
      throw new Error('VITE_SUPABASE_JWT_SECRET 未配置');
    }
    // Supabase JWT Secret 是 base64 编码的，需解码后作为签名密钥
    const keyBytes = Uint8Array.from(atob(secret), (c) => c.charCodeAt(0));
    const jwt = await new SignJWT({ sub: uuid, role: 'authenticated' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('10y')
      .sign(keyBytes);
    return jwt;
  }

  /** 保存令牌到 localStorage，同时签名并存储 JWT */
  async function saveToken(newToken: string) {
    token.value = newToken;
    localStorage.setItem(STORAGE_KEY, newToken);
    try {
      const jwt = await signToken(newToken);
      localStorage.setItem(JWT_KEY, jwt);
    } catch (e) {
      console.error('JWT 签名失败:', e);
    }
    isConfigured.value = true;
  }

  /** 获取已签名的 JWT（用于 Supabase setSession） */
  function getJwt(): string | null {
    return localStorage.getItem(JWT_KEY);
  }

  /** 清除令牌和 JWT */
  function clearToken() {
    token.value = '';
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(JWT_KEY);
    isConfigured.value = false;
  }

  /** 生成新的 UUID v4 令牌 */
  function generateToken(): string {
    return crypto.randomUUID();
  }

  // 初始化加载
  loadToken();

  return {
    token,
    isConfigured,
    loadToken,
    saveToken,
    getJwt,
    clearToken,
    generateToken,
  };
}
