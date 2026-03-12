import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ErrorFallbackProps {
  onRetry?: () => void;
  onGoHome?: () => void;
  maxRetriesReached: boolean;
}

export function ErrorFallback({ onRetry, onGoHome, maxRetriesReached }: ErrorFallbackProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>
        {maxRetriesReached
          ? 'This screen keeps failing. Please restart the app.'
          : 'Something went wrong.'}
      </Text>
      {!maxRetriesReached && onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      )}
      {onGoHome && (
        <TouchableOpacity style={styles.homeButton} onPress={onGoHome}>
          <Text style={styles.homeButtonText}>Go Home</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 26,
  },
  retryButton: {
    backgroundColor: '#000000',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 12,
    minWidth: 160,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  homeButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 160,
    alignItems: 'center',
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
});
