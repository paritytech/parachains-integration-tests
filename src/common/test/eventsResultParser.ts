export const eventResultParser = (stdout) => {
  let lines = stdout.split('\n')

  if (lines.length > 2) {
    lines = lines.splice(1,1);
  } else {
    lines = lines.splice(0,1);
  }

  return lines[0].split('-')[0]
}