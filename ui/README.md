cd ~/bisdom-ui && git pull origin main && npm run build && echo "✅ UI updated"


git pull origin main
sudo systemctl restart bisdom


# Clear stale data and re-trigger
python3 << 'EOF'
import psycopg2
conn = psycopg2.connect(
    'postgresql://postgres:bizzap123@bizzapdb.c3iya6wc0708.ap-south-1.rds.amazonaws.com:5432/bizzap_v1_db'
)
cur = conn.cursor()
cur.execute("DELETE FROM messages")
cur.execute("DELETE FROM conversations")
cur.execute("DELETE FROM deals")
cur.execute("DELETE FROM leads")
cur.execute("UPDATE requirements SET enrichment_status='enriched', matched_supplier_count=0")
conn.commit()
cur.close()
conn.close()
print("✅ Cleared")
EOF

curl -X POST https://api.bizzap.app/api/v1/admin/fix-profiles
curl -X POST https://api.bizzap.app/api/v1/admin/rematch/YOUR_REQUIREMENT_ID

