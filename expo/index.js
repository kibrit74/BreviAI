import { AppRegistry } from 'react-native';
import { registerRootComponent } from 'expo';
import WidgetHeadlessTask from './src/services/WidgetHeadlessTask';
import './src/services/BackgroundService'; // Register Background Location Task
import App from './App';

// Register headless task BEFORE App load
// This is required for React Native Headless JS to work
AppRegistry.registerHeadlessTask('ExecuteWorkflow', () => WidgetHeadlessTask);

// Register Notification Listener Headless Task -> Now handled by Native Service automatically

// Register the main app component
registerRootComponent(App);
