-- Enable realtime for locked_accounts table so UI updates automatically on lock/unlock
ALTER PUBLICATION supabase_realtime ADD TABLE locked_accounts;