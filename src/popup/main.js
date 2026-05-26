import { createApp } from 'vue';
import App from './App.vue';
import '../styles/global.css';

const app = createApp(App);
app.mount('#app');

// Set body class for popup sizing
document.body.classList.add('popup-body');
