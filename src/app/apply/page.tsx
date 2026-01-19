
"use client";

export default function ApplyPage() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("FORM SUBMITTED");
  };

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit">Submit Application (Test)</button>
    </form>
  );
}
