import { ref } from 'vue';
import { SignJWT, importJWK } from 'jose';

/** 全局单例状态：所有 useAuth() 调用者共享同一组 ref */
const token = ref<string>('');
const isConfigured = ref(false);

const STORAGE_KEY = 'prism_sync_token';
const JWT_KEY = 'prism_sync_jwt';

/** 从 localStorage 加载已有令牌（模块初始化时执行一次） */
(function loadToken() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    token.value = stored;
    isConfigured.value = true;
  }
})();

/**
 * 认证 composable：管理 Supabase 自定义 JWT 令牌
 *
 * 首版使用预共享 UUID 令牌实现零注册的设备识别。
 * UUID 通过 HS256 签名为 JWT（sub = UUID），注入 Supabase 客户端，
 * 使 Postgres 的 auth.uid() 返回该 UUID，配合 RLS 实现用户数据隔离。
 *
 * token / isConfigured 为模块级单例 ref，确保跨组件状态一致。
 */
export function useAuth() {
  /** 用 ES256 (ECC P-256) 将 UUID 签名为 Supabase 兼容的 JWT */
  async function signToken(uuid: string): Promise<string> {
    const privateKeyJson = import.meta.env.VITE_SUPABASE_JWT_PRIVATE_KEY;
    if (!privateKeyJson) {
      throw new Error('VITE_SUPABASE_JWT_PRIVATE_KEY 未配置');
    }
    const privateJwk = JSON.parse(privateKeyJson);
    const key = await importJWK(privateJwk, 'ES256');
    const jwt = await new SignJWT({ sub: uuid, role: 'authenticated' })
      .setProtectedHeader({ alg: 'ES256', kid: privateJwk.kid })
      .setIssuedAt()
      .setExpirationTime('10y')
      .sign(key);
    return jwt;
  }

  /** 保存令牌到 localStorage，同时签名并存储 JWT */
  async function saveToken(newToken: string) {
    token.value = newToken;
    localStorage.setItem(STORAGE_KEY, newToken);
    try {
      const jwt = await signToken(newToken);
      localStorage.setItem(JWT_KEY, jwt);
      console.log('[auth] JWT signed successfully, token:', newToken.slice(0, 8) + '...');
    } catch (e) {
      console.error('[auth] JWT 签名失败:', e);
    }
    isConfigured.value = true;
    console.log('[auth] sync configured, isConfigured =', isConfigured.value);
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

  return {
    token,
    isConfigured,
    saveToken,
    getJwt,
    clearToken,
    generateToken,
  };
}
