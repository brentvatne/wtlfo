import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import * as Updates from 'expo-updates';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error for debugging
    console.error('ErrorBoundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    this.setState({ errorInfo });
  }

  handleRestart = async (): Promise<void> => {
    try {
      // Try to reload the app using expo-updates
      if (Updates.isEnabled) {
        await Updates.reloadAsync();
      } else {
        // In development, just reset the error state to attempt recovery
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
        });
      }
    } catch (e) {
      // If reload fails, reset state to attempt recovery
      console.error('Failed to reload app:', e);
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      });
    }
  };

  handleDismiss = (): void => {
    // Reset error state to attempt recovery without full restart
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { error } = this.state;

      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.icon}>!</Text>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              The app encountered an unexpected error.
            </Text>

            {error && (
              <ScrollView style={styles.errorContainer} contentContainerStyle={styles.errorContent}>
                <Text style={styles.errorText}>{error.message}</Text>
              </ScrollView>
            )}

            <View style={styles.buttonContainer}>
              <Pressable
                style={styles.primaryButton}
                onPress={this.handleRestart}
              >
                <Text style={styles.primaryButtonText}>Restart App</Text>
              </Pressable>

              <Pressable
                style={styles.secondaryButton}
                onPress={this.handleDismiss}
              >
                <Text style={styles.secondaryButtonText}>Try Again</Text>
              </Pressable>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 320,
  },
  icon: {
    fontSize: 48,
    fontWeight: '700',
    color: '#ff6600',
    backgroundColor: '#1a1a1a',
    width: 80,
    height: 80,
    lineHeight: 80,
    textAlign: 'center',
    borderRadius: 40,
    marginBottom: 24,
    overflow: 'hidden',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#888899',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    maxHeight: 120,
    width: '100%',
    marginBottom: 24,
  },
  errorContent: {
    padding: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#ff6666',
    fontFamily: 'monospace',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#ff6600',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#888899',
    fontSize: 16,
    fontWeight: '500',
  },
});
