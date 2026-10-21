import styles from './App.module.css';
import { Editor } from './editor';

function App() {
  return (
    <main>
      <div className={styles.container}>
        <Editor />
      </div>
    </main>
  );
}

export default App;

