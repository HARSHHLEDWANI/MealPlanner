interface AuthError {
  message: string;
}

// Mock authentication service
export const signInWithOTP = async (email: string): Promise<{ error: AuthError | null }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { error: null };
};

export const signOut = async (): Promise<{ error: AuthError | null }> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return { error: null };
};

export const getCurrentUser = async (): Promise<{ 
  user: { id: string; email?: string } | null;
  error: AuthError | null;
}> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return { 
    user: null,
    error: null 
  };
}; 