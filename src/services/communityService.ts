import apiClient from './api';
import { API_ENDPOINTS } from '../config/api';

export interface Post {
  id: number;
  author: string;
  avatar?: string;
  content: string;
  likes: number;
  comments: Comment[];
  liked: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Comment {
  id: number;
  author: string;
  content: string;
  created_at: string;
}

export interface CreatePostData {
  content: string;
}

export interface CreateCommentData {
  content: string;
}

export const communityService = {
  // Get all posts
  async getPosts(): Promise<Post[]> {
    const response = await apiClient.get(API_ENDPOINTS.POSTS);
    return response.data;
  },

  // Get user's posts
  async getMyPosts(): Promise<Post[]> {
    const response = await apiClient.get(API_ENDPOINTS.MY_POSTS);
    return response.data;
  },

  // Get single post
  async getPost(id: number): Promise<Post> {
    const response = await apiClient.get(API_ENDPOINTS.POST_DETAIL(id));
    return response.data;
  },

  // Create new post
  async createPost(data: CreatePostData): Promise<Post> {
    const response = await apiClient.post(API_ENDPOINTS.POSTS, data);
    return response.data;
  },

  // Update post
  async updatePost(id: number, data: Partial<CreatePostData>): Promise<Post> {
    const response = await apiClient.put(API_ENDPOINTS.POST_DETAIL(id), data);
    return response.data;
  },

  // Delete post
  async deletePost(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.POST_DETAIL(id));
  },

  // Like/unlike post
  async toggleLike(postId: number): Promise<{ liked: boolean; likes: number }> {
    const response = await apiClient.post(API_ENDPOINTS.POST_LIKE(postId));
    return response.data;
  },

  // Add comment to post
  async addComment(postId: number, data: CreateCommentData): Promise<Comment> {
    const response = await apiClient.post(API_ENDPOINTS.POST_COMMENT(postId), data);
    return response.data;
  },

  // Delete comment
  async deleteComment(postId: number, commentId: number): Promise<void> {
    // Assuming the API has an endpoint for this
    await apiClient.delete(`${API_ENDPOINTS.POST_DETAIL(postId)}/comments/${commentId}/`);
  },
};
