A small CLI tool to conveniently edit CSV files.

It supports editing existing rows and appending new rows. It assumes that the first row
is a header row with the names of each column. It is intended for making quick, simple
edits to CSV files more quickly than spreadsheet programs like LibreOffice Writer and
more conveniently than text editors like Vim.

There are many things that it cannot do, including:

    - editing the header row
    - changing the order of rows or columns
    - deleting columns or rows
    - adding new columns
