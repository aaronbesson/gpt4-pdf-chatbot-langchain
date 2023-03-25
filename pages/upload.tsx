import React, { useState } from 'react';


function App() {
  const [docs, setDocs] = useState([]);
  // State to store uploaded file
  const [file, setFile] = React.useState('');
  const [loaded, setLoaded] = React.useState(false);
  function handleChange(event) {
    setFile(event.target.files[0]);
    setLoaded(true);
  }

  return (
    <div>
      <input type="file" onChange={handleChange} accept="/text/*" />
      {file.name}
      <form>
        <input />
      </form>
    </div>
  );
}

export default App;
