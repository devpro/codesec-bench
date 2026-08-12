package com.example.reporting;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import javax.sql.DataSource;
import org.springframework.stereotype.Repository;

/**
 * Report lookup over plain JDBC.
 *
 * Intentionally vulnerable, see cases/sql-injection-concat.
 */
@Repository
public class ReportRepository {

    private final DataSource dataSource;

    public ReportRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    /**
     * Return every report belonging to an owner.
     *
     * The owner name arrives from a request parameter and is concatenated into the statement.
     */
    public List<String> findByOwner(String owner) throws Exception {
        List<String> titles = new ArrayList<>();

        try (Connection connection = dataSource.getConnection();
                Statement statement = connection.createStatement()) {

            // VULN: a quote in owner ends the literal and the remainder is executed as SQL.
            String sql = "SELECT title FROM reports WHERE owner = '" + owner + "'";
            ResultSet results = statement.executeQuery(sql);

            while (results.next()) {
                titles.add(results.getString("title"));
            }
        }

        return titles;
    }
}
