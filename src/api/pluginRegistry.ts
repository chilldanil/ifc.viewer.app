import type { ReactNode } from 'react';

export type PluginDispose = () => void;

export interface PanelRegistration {
  id: string;
  title: string;
  render: ReactNode | (() => ReactNode);
}

export interface CommandRegistration {
  id: string;
  run: () => void | Promise<void>;
  hotkey?: string;
  description?: string;
}

export interface PluginRegistry {
  registerPanel: (panel: PanelRegistration) => PluginDispose;
  registerCommand: (command: CommandRegistration) => PluginDispose;
  listPanels: () => PanelRegistration[];
  listCommands: () => CommandRegistration[];
}

export const createPluginRegistry = (): PluginRegistry => {
  const panels = new Map<string, PanelRegistration>();
  const commands = new Map<string, CommandRegistration>();

  return {
    registerPanel: (panel) => {
      panels.set(panel.id, panel);
      return () => panels.delete(panel.id);
    },
    registerCommand: (command) => {
      commands.set(command.id, command);
      return () => commands.delete(command.id);
    },
    listPanels: () => Array.from(panels.values()),
    listCommands: () => Array.from(commands.values()),
  };
};
