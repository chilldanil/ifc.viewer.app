import { useState, useEffect, useRef } from 'react';
import * as OBC from '@thatopen/components';
import * as BUI from '@thatopen/ui';
import { ErrorType, handleBIMError, withErrorHandling } from '../utils/errorHandler';

export interface BIMInitializationState {
	components: OBC.Components | null;
	isInitialized: boolean;
	isLoading: boolean;
	error: string | null;
	initializationAttempts: number;
}

export interface BIMInitializationActions {
	retry: () => void;
	reset: () => void;
	cleanup: () => void;
}

// Global reference to prevent multiple BIM component instances
let globalBIMComponents: OBC.Components | null = null;
let globalInitializationPromise: Promise<OBC.Components> | null = null;

export const useBIMInitialization = (): BIMInitializationState & BIMInitializationActions => {
	const [state, setState] = useState<BIMInitializationState>({
		components: globalBIMComponents,
		isInitialized: !!globalBIMComponents,
		isLoading: false,
		error: null,
		initializationAttempts: 0,
	});

	const initializationInProgressRef = useRef(false);
	const mountedRef = useRef(true);

	const cleanup = () => {
		// Don't dispose global components as they might be used by other instances
		// Just clear the local state
		setState(prev => ({
			...prev,
			components: null,
			isInitialized: false,
		}));
	};

	const initializeBIM = async () => {
		// If already initialized globally, use the existing instance
		if (globalBIMComponents) {
			setState(prev => ({
				...prev,
				components: globalBIMComponents,
				isInitialized: true,
				isLoading: false,
				error: null,
			}));
			return;
		}

		// If initialization is in progress, wait for it
		if (globalInitializationPromise) {
			try {
				const components = await globalInitializationPromise;
				if (mountedRef.current) {
					setState(prev => ({
						...prev,
						components,
						isInitialized: true,
						isLoading: false,
						error: null,
					}));
				}
				return;
			} catch (error) {
				// Fall through to retry initialization
			}
		}

		if (initializationInProgressRef.current) {
			return; // Prevent multiple simultaneous initializations
		}

		initializationInProgressRef.current = true;
		
		setState(prev => ({ 
			...prev, 
			isLoading: true, 
			error: null,
			initializationAttempts: prev.initializationAttempts + 1 
		}));

		// Create a single initialization promise
		globalInitializationPromise = withErrorHandling(async () => {
			// Initialize BUI Manager (safe to call multiple times)
			try {
				BUI.Manager.init();
			} catch (error) {
				// BUI might already be initialized, ignore error
			}

			// Create components instance
			const componentsInstance = new OBC.Components();
			await componentsInstance.init();

			// Configure WebIFC path from env if provided
			try {
				const ifcLoader = componentsInstance.get(OBC.IfcLoader);
				const path = (import.meta as any).env?.VITE_WEBIFC_PATH as string | undefined;
				if (path) {
					(ifcLoader.settings as any).wasm = { path, absolute: true } as any;
				}
			} catch {
				// Ignore errors when configuring WebIFC path
			}
			
			return componentsInstance;
		}, ErrorType.BIM_INITIALIZATION, 'useBIMInitialization') as Promise<OBC.Components>;

		try {
			const result = await globalInitializationPromise;
			
			if (!mountedRef.current) {
				initializationInProgressRef.current = false;
				return; // Component was unmounted during initialization
			}

			if (result) {
				globalBIMComponents = result;
				setState(prev => ({
					components: result,
					isInitialized: true,
					isLoading: false,
					error: null,
					initializationAttempts: prev.initializationAttempts,
				}));
			} else {
				throw new Error('Failed to initialize BIM components');
			}
		} catch (error) {
			const errorMessage = `Failed to initialize BIM components: ${error instanceof Error ? error.message : 'Unknown error'}`;
			
			handleBIMError(
				ErrorType.BIM_INITIALIZATION,
				errorMessage,
				{ attempts: state.initializationAttempts + 1, error },
				'useBIMInitialization'
			);
			
			if (mountedRef.current) {
				setState(prev => ({
					...prev,
					isLoading: false,
					error: errorMessage,
				}));
			}

			// Clear the failed promise
			globalInitializationPromise = null;
		} finally {
			initializationInProgressRef.current = false;
		}
	};

	const retry = () => {
		if (!state.isLoading && state.initializationAttempts < 3) {
			// Reset global state for retry
			globalBIMComponents = null;
			globalInitializationPromise = null;
			initializeBIM();
		} else if (state.initializationAttempts >= 3) {
			handleBIMError(
				ErrorType.BIM_INITIALIZATION,
				'Maximum initialization attempts reached',
				{ attempts: state.initializationAttempts },
				'useBIMInitialization'
			);
		}
	};

	const reset = () => {
		// Reset global state
		globalBIMComponents = null;
		globalInitializationPromise = null;
		
		setState({
			components: null,
			isInitialized: false,
			isLoading: false,
			error: null,
			initializationAttempts: 0,
		});
	};

	useEffect(() => {
		mountedRef.current = true;
		initializeBIM();

		return () => {
			mountedRef.current = false;
			initializationInProgressRef.current = false;
		};
	}, []);

	return {
		...state,
		retry,
		reset,
		cleanup,
	};
}; 