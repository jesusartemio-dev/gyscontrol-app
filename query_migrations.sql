-- Query to get detailed migration history from PostgreSQL
SELECT 
    id,
    migration_name,
    started_at,
    finished_at,
    logs,
    CASE 
        WHEN finished_at > NOW() - INTERVAL '1 month' THEN 'Recent (Last Month)'
        WHEN finished_at > NOW() - INTERVAL '3 months' THEN 'Recent (Last 3 Months)'
        ELSE 'Older'
    END as time_category
FROM "_prisma_migrations" 
ORDER BY finished_at DESC;