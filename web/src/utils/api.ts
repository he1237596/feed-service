import useAuthStore from '@/stores/authStore'

// API 基础配置
const API_BASE_URL = '/api'

// 统一的错误处理
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// 响应处理
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    let errorData = {}
    try {
      errorData = await response.json()
    } catch {
      // JSON 解析失败时使用默认错误
    }

    throw new ApiError(
      (errorData as any).error || `请求失败 (${response.status})`,
      response.status,
      (errorData as any).code
    )
  }

  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return response.json()
  }
  
  return response.text()
}

// 请求拦截器
const request = async (url: string, options: RequestInit = {}): Promise<any> => {
  const token = useAuthStore.getState().token
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // 如果有 token，添加认证头
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  }

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, config)
    return await handleResponse(response)
  } catch (error) {
    console.error('API request failed:', error)
    throw error
  }
}

// HTTP 方法封装
export const api = {
  get: (url: string, options?: Omit<RequestInit, 'method' | 'body'>) => 
    request(url, { ...options, method: 'GET' }),
    
  post: (url: string, data?: any, options?: Omit<RequestInit, 'method' | 'body'>) =>
    request(url, { 
      ...options, 
      method: 'POST', 
      body: data ? JSON.stringify(data) : undefined 
    }),
    
  put: (url: string, data?: any, options?: Omit<RequestInit, 'method' | 'body'>) =>
    request(url, { 
      ...options, 
      method: 'PUT', 
      body: data ? JSON.stringify(data) : undefined 
    }),
    
  patch: (url: string, data?: any, options?: Omit<RequestInit, 'method' | 'body'>) =>
    request(url, { 
      ...options, 
      method: 'PATCH', 
      body: data ? JSON.stringify(data) : undefined 
    }),
    
  delete: (url: string, options?: Omit<RequestInit, 'method' | 'body'>) =>
    request(url, { ...options, method: 'DELETE' }),
    
  // 文件上传
  upload: (url: string, formData: FormData, options?: Omit<RequestInit, 'method' | 'body' | 'headers'>) => {
    const token = useAuthStore.getState().token
    const headers: Record<string, string> = {}
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return request(url, {
      ...options,
      method: 'POST',
      body: formData,
      headers
    })
  }
}

export default api