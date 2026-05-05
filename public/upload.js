async function upload(){
  const file = document.getElementById("file").files[0];

  const form = new FormData();
  form.append("image", file);

  const res = await fetch("/upload", {method:"POST", body:form});
  const data = await res.json();

  const modelRes = await fetch("/analyze", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({imageUrl:data.imageUrl})
  });

  const result = await modelRes.json();

  document.getElementById("result").innerText =
    JSON.stringify(result, null, 2);
}