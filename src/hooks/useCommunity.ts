import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communityService, Post, CreatePostData, CreateCommentData } from '../services/communityService';

// Query keys
export const POST_KEYS = {
  all: ['posts'] as const,
  lists: () => [...POST_KEYS.all, 'list'] as const,
  list: (filters: string) => [...POST_KEYS.lists(), filters] as const,
  details: () => [...POST_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...POST_KEYS.details(), id] as const,
  my: () => [...POST_KEYS.all, 'my'] as const,
};

// Get all posts
export const usePosts = () => {
  return useQuery({
    queryKey: POST_KEYS.lists(),
    queryFn: communityService.getPosts,
    staleTime: 2 * 60 * 1000, // 2 minutes (more frequent updates for community)
  });
};

// Get user's posts
export const useMyPosts = () => {
  return useQuery({
    queryKey: POST_KEYS.my(),
    queryFn: communityService.getMyPosts,
    staleTime: 2 * 60 * 1000,
  });
};

// Get single post
export const usePost = (id: number) => {
  return useQuery({
    queryKey: POST_KEYS.detail(id),
    queryFn: () => communityService.getPost(id),
    enabled: !!id,
  });
};

// Create post mutation
export const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: communityService.createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POST_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: POST_KEYS.my() });
    },
  });
};

// Update post mutation
export const useUpdatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreatePostData> }) =>
      communityService.updatePost(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: POST_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: POST_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: POST_KEYS.my() });
    },
  });
};

// Delete post mutation
export const useDeletePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: communityService.deletePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POST_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: POST_KEYS.my() });
    },
  });
};

// Toggle like mutation
export const useToggleLike = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: communityService.toggleLike,
    onSuccess: (data, variables) => {
      // Optimistically update the post data
      queryClient.setQueryData(POST_KEYS.detail(variables), (oldData: Post | undefined) => {
        if (oldData) {
          return {
            ...oldData,
            liked: data.liked,
            likes: data.likes,
          };
        }
        return oldData;
      });
      queryClient.invalidateQueries({ queryKey: POST_KEYS.lists() });
    },
  });
};

// Add comment mutation
export const useAddComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, data }: { postId: number; data: CreateCommentData }) =>
      communityService.addComment(postId, data),
    onSuccess: (newComment, variables) => {
      // Optimistically update the post data
      queryClient.setQueryData(POST_KEYS.detail(variables.postId), (oldData: Post | undefined) => {
        if (oldData) {
          return {
            ...oldData,
            comments: [...oldData.comments, newComment],
          };
        }
        return oldData;
      });
      queryClient.invalidateQueries({ queryKey: POST_KEYS.lists() });
    },
  });
};
