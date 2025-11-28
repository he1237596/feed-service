import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from 'react-query'
import { message } from 'antd'
import api, { ApiError } from '@/utils/api'

// 通用的查询选项
const defaultQueryOptions = {
  retry: 2,
  refetchOnWindowFocus: false,
  staleTime: 300000, // 5分钟缓存
}

// 通用的变更选项
const defaultMutationOptions = {
  onError: (error: any) => {
    if (error instanceof ApiError) {
      if (error.status >= 400 && error.status < 500) {
        message.error(error.message || '请求参数错误')
      } else if (error.status >= 500) {
        message.error('服务器错误，请稍后重试')
      }
    } else {
      message.error('网络错误，请检查连接')
    }
  }
}

// 查询钩子
export const useApiQuery = <T = any>(
  key: string | string[],
  fetcher: () => Promise<T>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<T>(key, fetcher, {
    ...defaultQueryOptions,
    ...options,
  })
}

// 变更钩子
export const useApiMutation = <T = any, V = any>(
  fetcher: (variables: V) => Promise<T>,
  options?: UseMutationOptions<T, any, V, any>
) => {
  return useMutation<T, any, V, any>(fetcher, {
    ...defaultMutationOptions,
    ...options,
  })
}

// 带成功消息的变更钩子
export const useApiMutationWithSuccess = <T = any, V = any>(
  fetcher: (variables: V) => Promise<T>,
  successMessage?: string,
  options?: UseMutationOptions<T, any, V, any>
) => {
  return useMutation<T, any, V, any>(fetcher, {
    ...defaultMutationOptions,
    ...options,
    onSuccess: (data, variables, context) => {
      if (successMessage) {
        message.success(successMessage)
      }
      if (options?.onSuccess) {
        options.onSuccess(data, variables, context)
      }
    }
  })
}

export { api, ApiError }