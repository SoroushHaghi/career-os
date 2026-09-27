// Artifact naming compatibility helper.

function buildTxtName_(
  filename
) {

  const dot =
    filename.lastIndexOf(
      '.'
    );


  if (dot <= 0) {
    return (
      filename +
      '.txt'
    );
  }


  return (
    filename.substring(
      0,
      dot
    ) +
    '.txt'
  );
}
